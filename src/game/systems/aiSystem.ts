import * as THREE from 'three'
import type { InputState } from './inputSystem'
import {
  ballPosition,
  ballVelocity,
  callState,
  dribbleState,
  passState,
  playerRegistry,
  teamPhase,
  type AiState,
  type Behaviour,
  type PlayerRecord,
} from './worldRegistry'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'
import { ROLE_BANDS } from '@/game/data/formations'
import { GOAL_DIMENSIONS } from '@/game/entities/Goal'
import { DIFFICULTY, type DifficultyTuning } from '@/game/data/difficulty'
import { useGameStore } from '@/game/state/gameStore'

const HALF_W = FIELD_DIMENSIONS.width / 2
const HALF_L = FIELD_DIMENSIONS.length / 2
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2

/** Chasers further than this from the ball sprint (sometimes). */
const SPRINT_DISTANCE = 9
/** Keeper stays within this much of the goal centre laterally. */
const GK_LATERAL_LIMIT = HALF_GOAL_W + 1.4
/** Keeper charges the ball when it comes this close to their goal. */
const GK_RUSH_RADIUS = 7
/** How far off the line the keeper stands when the ball is far away. */
const GK_MAX_ADVANCE = 3.2

const _ball = new THREE.Vector3()
const _target = new THREE.Vector3()
const _cand = new THREE.Vector3()

/** Fresh randomised AI traits, so no two players behave identically. */
export function makeAiState(): AiState {
  return {
    speed: 0.9 + Math.random() * 0.14, // 0.90 - 1.04 of the AI base factor
    jitterX: 0,
    jitterZ: 0,
    nextJitterAt: 0,
    reactUntil: 0,
    makeRun: false,
    runX: 0,
    runZ: 0,
    nextRunAt: 0,
    diveUntil: 0,
    diveSide: 0,
    speedBoost: 1,
    behaviour: 'idle',
  }
}

/** Tag the behaviour this player settled on, for the on-screen intent labels. */
function tag(rec: PlayerRecord, behaviour: Behaviour, input: InputState): InputState {
  rec.ai.behaviour = behaviour
  return input
}

/** Current difficulty tuning; read once per call rather than per lookup. */
function tuning(): DifficultyTuning {
  return DIFFICULTY[useGameStore.getState().difficulty]
}

/** The Z of the goal this player is attacking. */
function attackGoalZ(rec: PlayerRecord): number {
  return rec.team === 'home' ? -HALF_L : HALF_L
}

/** +1 or -1: the direction this player attacks along Z. */
function attackDir(rec: PlayerRecord): number {
  return rec.team === 'home' ? -1 : 1
}

/** Distance from a point to the nearest opponent of `team`. */
function nearestOpponentDistance(team: string, x: number, z: number): number {
  let best = Infinity
  for (const rec of playerRegistry.values()) {
    if (rec.team === team) continue
    const d = Math.hypot(rec.position.x - x, rec.position.z - z)
    if (d < best) best = d
  }
  return best
}

/** Distance from a point to the nearest team-mate (excluding `selfId`). */
function nearestTeammateDistance(
  team: string,
  selfId: string,
  x: number,
  z: number,
): number {
  let best = Infinity
  for (const rec of playerRegistry.values()) {
    if (rec.team !== team || rec.id === selfId) continue
    const d = Math.hypot(rec.position.x - x, rec.position.z - z)
    if (d < best) best = d
  }
  return best
}

/** Whichever player of a team is closest to the ball. */
function closestOfTeam(
  team: string,
  ball: THREE.Vector3,
  exclude?: string,
): PlayerRecord | null {
  let best: PlayerRecord | null = null
  let bestD = Infinity
  for (const rec of playerRegistry.values()) {
    if (rec.team !== team || rec.isGoalkeeper || rec.id === exclude) continue
    const d = rec.position.distanceToSquared(ball)
    if (d < bestD) {
      bestD = d
      best = rec
    }
  }
  return best
}

/**
 * Scripted AI, one call per frame per player. Produces the same InputState the
 * human uses, so both share all movement code.
 *
 * Behaviours are chosen by an explicit priority cascade rather than one blob:
 *   Goalkeep · InterceptPass · PressCarrier · CoverLane · SupportRun ·
 *   Chase · HoldShape
 *
 * The key improvement over "everybody runs at the ball" is CoverLane: only the
 * closest defender presses, while the second closest drops into the passing
 * lane instead of piling in.
 */
export function computeAiInput(rec: PlayerRecord, input: InputState): InputState {
  input.sprinting = false
  input.shootHeld = false
  input.shootCharge = 0
  input.shootReleased = false
  input.passPressed = false
  input.hasShootAim = false
  input.moveDirection.set(0, 0)

  const ball = ballPosition(_ball)
  if (!ball) return input

  const now = performance.now() / 1000
  const ai = rec.ai
  const tune = tuning()

  // Refresh the wandering offset every ~0.6-1.4s.
  if (now >= ai.nextJitterAt) {
    ai.jitterX = (Math.random() - 0.5) * 3
    ai.jitterZ = (Math.random() - 0.5) * 3
    ai.nextJitterAt = now + 0.6 + Math.random() * 0.8
  }

  if (rec.isGoalkeeper) {
    return tag(rec, 'keeper', goalkeepBehaviour(rec, ball, input, tune))
  }

  const possessor = dribbleState.possessorId
    ? playerRegistry.get(dribbleState.possessorId)
    : null

  // --- InterceptPass: cut out a ball travelling to an opponent --------------
  if (
    passState.active &&
    passState.fromId &&
    playerRegistry.get(passState.fromId)?.team !== rec.team &&
    interceptBehaviour(rec, ball, input, tune)
  ) {
    return tag(rec, 'intercept', input)
  }

  // --- Carrying it myself ---------------------------------------------------
  if (possessor?.id === rec.id) {
    return tag(rec, 'carry', carryBehaviour(rec, input))
  }

  // --- My team has it: make a run or hold shape -----------------------------
  if (possessor && possessor.team === rec.team) {
    // The user's selected team-mate always breaks into space.
    if (ai.makeRun || shouldSupport(rec, possessor)) {
      return tag(rec, 'support', supportRunBehaviour(rec, possessor, input, now))
    }
    return tag(rec, 'shape', holdShapeBehaviour(rec, ball, input, 0.1, 0.4, 4))
  }

  // --- They have it: press with one, cover the lane with the next -----------
  if (possessor && possessor.team !== rec.team) {
    const presser = closestOfTeam(rec.team, ball)
    if (presser?.id === rec.id) {
      return tag(rec, 'press', pressBehaviour(rec, possessor, input, tune))
    }
    const cover = closestOfTeam(rec.team, ball, presser?.id)
    if (cover?.id === rec.id) {
      return tag(rec, 'cover', coverLaneBehaviour(rec, possessor, input, tune))
    }
    return tag(rec, 'shape', holdShapeBehaviour(rec, ball, input, 0.2, 0.45, -2))
  }

  // --- Loose ball -----------------------------------------------------------
  const chaser = closestOfTeam(rec.team, ball)
  if (chaser?.id === rec.id) {
    return tag(rec, 'chase', chaseBehaviour(rec, ball, input, tune, now))
  }
  ai.reactUntil = 0
  return tag(rec, 'shape', holdShapeBehaviour(rec, ball, input, 0.15, 0.35, 0))
}

// ---------------------------------------------------------------------------
// Behaviours
// ---------------------------------------------------------------------------

/** Dribble at the goal, drifting so runs curve instead of tracking a laser line. */
function carryBehaviour(rec: PlayerRecord, input: InputState): InputState {
  _target.set(rec.ai.jitterX * 1.5, 0, attackGoalZ(rec))
  input.sprinting = true
  steerToward(rec, _target, input)
  return input
}

/**
 * A team-mate has the ball: two players push on to give them an option, the
 * rest hold shape. Being one of the two nearest is enough to qualify.
 */
function shouldSupport(rec: PlayerRecord, carrier: PlayerRecord): boolean {
  let closerCount = 0
  const d = rec.position.distanceToSquared(carrier.position)
  for (const other of playerRegistry.values()) {
    if (other.team !== rec.team || other.isGoalkeeper) continue
    if (other.id === rec.id || other.id === carrier.id) continue
    if (other.position.distanceToSquared(carrier.position) < d) closerCount++
  }
  return closerCount < 2
}

/**
 * Break into space ahead of the carrier. Samples candidate positions in an arc
 * in front and picks the one that is most open, furthest forward and least
 * crowded by team-mates — which is what makes attacks actually combine rather
 * than everyone standing on the same blade of grass.
 */
function supportRunBehaviour(
  rec: PlayerRecord,
  carrier: PlayerRecord,
  input: InputState,
  now: number,
): InputState {
  const ai = rec.ai
  if (now >= ai.nextRunAt) {
    const dir = attackDir(rec)
    let bestScore = -Infinity
    for (let i = 0; i < 7; i++) {
      // Fan out across the width, ahead of the carrier by a varying amount.
      const spreadX = (i / 6 - 0.5) * 2 * (HALF_W * 0.8)
      const ahead = 6 + (i % 3) * 6
      const x = THREE.MathUtils.clamp(
        carrier.position.x * 0.35 + spreadX,
        -HALF_W + 2,
        HALF_W - 2,
      )
      const z = THREE.MathUtils.clamp(
        carrier.position.z + dir * ahead,
        -HALF_L + 3,
        HALF_L - 3,
      )
      const openness = Math.min(nearestOpponentDistance(rec.team, x, z), 12)
      const progress = (carrier.position.z - z) * dir // metres gained upfield
      const crowding = Math.min(
        nearestTeammateDistance(rec.team, rec.id, x, z),
        10,
      )
      // Prefer open space, then forward progress, then not bunching up. The
      // travel penalty stops players sprinting across the whole pitch.
      const travel = Math.hypot(x - rec.position.x, z - rec.position.z)
      const score = openness * 1.6 + progress * 0.9 + crowding * 0.6 - travel * 0.5
      if (score > bestScore) {
        bestScore = score
        ai.runX = x
        ai.runZ = z
      }
    }
    ai.nextRunAt = now + 0.7 + Math.random() * 0.5
  }

  _target.set(ai.runX, 0, ai.runZ)
  input.sprinting = rec.position.distanceTo(_target) > 6
  steerToward(rec, _target, input)
  return input
}

/** Close down the carrier on an intercept course rather than chasing their back. */
function pressBehaviour(
  rec: PlayerRecord,
  carrier: PlayerRecord,
  input: InputState,
  tune: DifficultyTuning,
): InputState {
  const dist = rec.position.distanceTo(carrier.position)
  if (dist > tune.pressRadius) {
    // Too far to press — drop into shape instead of chasing pointlessly.
    return holdShapeBehaviour(rec, carrier.position, input, 0.2, 0.45, -2)
  }
  // Aim slightly goal-side of the carrier so we cut off the run, not trail it.
  const goalSide = attackDir(rec) * -1
  _target.set(
    carrier.position.x,
    0,
    carrier.position.z + goalSide * Math.min(1.2, dist * 0.25),
  )
  input.sprinting = dist > 2.5
  steerToward(rec, _target, input)
  return input
}

/**
 * Second defender: instead of also chasing the ball, drop into the most
 * dangerous passing lane — between the carrier and their best forward option.
 */
function coverLaneBehaviour(
  rec: PlayerRecord,
  carrier: PlayerRecord,
  input: InputState,
  tune: DifficultyTuning,
): InputState {
  const dir = attackDir(carrier)
  let threat: PlayerRecord | null = null
  let bestScore = -Infinity
  for (const other of playerRegistry.values()) {
    if (other.team !== carrier.team || other.isGoalkeeper) continue
    if (other.id === carrier.id) continue
    // The most dangerous option is the one furthest forward and most open.
    const progress = (carrier.position.z - other.position.z) * dir
    const open = Math.min(
      nearestOpponentDistance(carrier.team, other.position.x, other.position.z),
      10,
    )
    const score = progress * 1.2 + open
    if (score > bestScore) {
      bestScore = score
      threat = other
    }
  }

  if (!threat) {
    return holdShapeBehaviour(rec, carrier.position, input, 0.2, 0.45, -2)
  }
  // Sit two-thirds of the way down the lane, nearer the receiving end.
  _target.set(
    THREE.MathUtils.lerp(carrier.position.x, threat.position.x, 0.62),
    0,
    THREE.MathUtils.lerp(carrier.position.z, threat.position.z, 0.62),
  )
  input.sprinting = rec.position.distanceTo(_target) > tune.pressRadius * 0.5
  steerToward(rec, _target, input)
  return input
}

/**
 * A pass is in flight toward an opponent. If we are close enough to the pass
 * line, attack the point where the ball will be — not where it is now.
 * Returns false when this player is nowhere near the lane.
 */
function interceptBehaviour(
  rec: PlayerRecord,
  ball: THREE.Vector3,
  input: InputState,
  tune: DifficultyTuning,
): boolean {
  const ax = ball.x
  const az = ball.z
  const bx = passState.target.x
  const bz = passState.target.z
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz
  if (lenSq < 0.5) return false

  // Project this player onto the remaining pass line.
  const t = THREE.MathUtils.clamp(
    ((rec.position.x - ax) * dx + (rec.position.z - az) * dz) / lenSq,
    0,
    1,
  )
  const px = ax + dx * t
  const pz = az + dz * t
  const perp = Math.hypot(rec.position.x - px, rec.position.z - pz)
  if (perp > tune.interceptRadius) return false

  // Lead the ball a little so we arrive as it does rather than behind it.
  const lead = Math.min(1, t + 0.15)
  _cand.set(ax + dx * lead, 0, az + dz * lead)
  input.sprinting = true
  steerToward(rec, _cand, input)
  return true
}

/** Pursue a loose ball, with a difficulty-scaled hesitation before committing. */
function chaseBehaviour(
  rec: PlayerRecord,
  ball: THREE.Vector3,
  input: InputState,
  tune: DifficultyTuning,
  now: number,
): InputState {
  const ai = rec.ai
  const [lo, hi] = tune.reactionDelay
  if (ai.reactUntil === 0) ai.reactUntil = now + lo + Math.random() * (hi - lo)
  if (now < ai.reactUntil) return input // hesitate

  const distToBall = rec.position.distanceTo(ball)
  _target.set(ball.x + ai.jitterX * 0.25, 0, ball.z + ai.jitterZ * 0.25)
  input.sprinting = distToBall > SPRINT_DISTANCE && Math.random() > 0.35
  steerToward(rec, _target, input)
  return input
}

/**
 * Hold the formation slot, shaded toward the ball. `push` shifts the whole line
 * up the pitch when attacking and back when defending.
 */
function holdShapeBehaviour(
  rec: PlayerRecord,
  ball: THREE.Vector3,
  input: InputState,
  shadeX: number,
  shadeZ: number,
  push: number,
): InputState {
  const ai = rec.ai
  _target.set(
    rec.spawn[0] + (ball.x - rec.spawn[0]) * shadeX + ai.jitterX,
    0,
    rec.spawn[2] +
      (ball.z - rec.spawn[2]) * shadeZ +
      attackDir(rec) * push +
      ai.jitterZ,
  )
  steerToward(rec, _target, input)
  return input
}

const _bvel = new THREE.Vector3()

/**
 * Goalkeeper. Stands on the bisector between the ball and the goal centre,
 * advancing off the line as the ball gets closer (proper angle narrowing),
 * dives when a shot is heading for a corner, and charges out to smother when
 * an attacker is bearing down.
 */
function goalkeepBehaviour(
  rec: PlayerRecord,
  ball: THREE.Vector3,
  input: InputState,
  tune: DifficultyTuning,
): InputState {
  const goalZ = Math.sign(rec.spawn[2]) * HALF_L
  const frontDir = -Math.sign(goalZ) // toward the field centre
  const distToBall = rec.position.distanceTo(ball)
  const ballDepth = Math.abs(ball.z - goalZ)
  const now = performance.now() / 1000
  const ai = rec.ai

  // --- Shot reading: solve where the ball crosses the goal line -------------
  ai.speedBoost = 1
  const vel = ballVelocity(_bvel)
  if (vel) {
    const towardGoal = goalZ < 0 ? vel.z < -4 : vel.z > 4
    if (towardGoal) {
      const timeToLine = (goalZ - ball.z) / vel.z
      // Lower anticipation = the keeper only reacts once it's nearly there.
      const reactWindow = 0.4 + tune.gkAnticipation * 1.0
      if (timeToLine > 0 && timeToLine < reactWindow) {
        const crossX = ball.x + vel.x * timeToLine
        if (Math.abs(crossX) < HALF_GOAL_W + 1.5) {
          const dx = crossX - rec.position.x
          if (Math.abs(dx) > 0.7 && Math.abs(dx) < tune.gkReach) {
            // Commit to a dive: pose plus a burst of lateral pace.
            ai.diveUntil = now + 0.55
            ai.diveSide = Math.sign(dx)
            ai.speedBoost = tune.gkDiveSpeed * 1.6
          }
          _target.set(
            THREE.MathUtils.clamp(crossX, -GK_LATERAL_LIMIT, GK_LATERAL_LIMIT),
            0,
            goalZ + frontDir * 0.7,
          )
          input.sprinting = true
          steerToward(rec, _target, input)
          return input
        }
      }
    }
  }

  const inDanger = ballDepth < GK_RUSH_RADIUS + 3 && Math.abs(ball.x) < GK_LATERAL_LIMIT + 4
  if (inDanger && distToBall < GK_RUSH_RADIUS) {
    // Rush the ball to smother the shot.
    _target.copy(ball)
    input.sprinting = true
    steerToward(rec, _target, input)
    return input
  }

  // Narrow the angle: stand on the line from the ball to the goal centre, a
  // distance off the line that grows as the ball moves further out.
  const toGoalX = 0 - ball.x
  const toGoalZ = goalZ - ball.z
  const toGoalLen = Math.hypot(toGoalX, toGoalZ) || 1
  // Further ball = further off the line (up to GK_MAX_ADVANCE), but never so
  // far that a lob is trivial.
  const advance = THREE.MathUtils.clamp(
    (ballDepth / HALF_L) * GK_MAX_ADVANCE * (0.6 + tune.gkAnticipation * 0.6),
    0.8,
    GK_MAX_ADVANCE,
  )
  const standX = ball.x + (toGoalX / toGoalLen) * (toGoalLen - advance)
  const standZ = ball.z + (toGoalZ / toGoalLen) * (toGoalLen - advance)

  _target.set(
    THREE.MathUtils.clamp(standX, -GK_LATERAL_LIMIT, GK_LATERAL_LIMIT),
    0,
    // Never drift behind the line, never stray too far in front.
    goalZ + frontDir * THREE.MathUtils.clamp(Math.abs(standZ - goalZ), 0.6, GK_MAX_ADVANCE),
  )
  input.sprinting = rec.position.distanceTo(_target) > 3
  steerToward(rec, _target, input)
  return input
}

// ---------------------------------------------------------------------------
// Kicking decisions
// ---------------------------------------------------------------------------

/** Inside this distance, and from a sane angle, an AI will shoot. */
const AI_SHOOT_RANGE = 13
/** Widest angle off the centre of goal an AI will shoot from, in radians. */
const AI_SHOOT_ANGLE = 0.9
/** Seconds between AI kicks, so they don't machine-gun the ball. */
export const AI_KICK_COOLDOWN = 1.1
/** An opponent this close counts as real pressure. */
const PRESSURE_RADIUS = 2.6
/**
 * Seconds a carrier keeps the ball before it will even consider a pass, unless
 * it's being closed down or the user has called for it.
 */
const MIN_CARRY_TIME = 1.4
/** A passing lane is blocked if an opponent is within this of the line. */
const LANE_CLEARANCE = 1.7

const _goalTarget = new THREE.Vector3()

/** Is an opponent close enough that this player has to do something now? */
function underPressure(rec: PlayerRecord): boolean {
  for (const other of playerRegistry.values()) {
    if (other.team === rec.team) continue
    if (
      Math.hypot(
        other.position.x - rec.position.x,
        other.position.z - rec.position.z,
      ) < PRESSURE_RADIUS
    ) {
      return true
    }
  }
  return false
}

/** Is the straight line between two players free of opponents? */
function laneIsClear(from: PlayerRecord, to: PlayerRecord): boolean {
  const dx = to.position.x - from.position.x
  const dz = to.position.z - from.position.z
  const lenSq = dx * dx + dz * dz
  if (lenSq < 0.5) return false
  for (const other of playerRegistry.values()) {
    if (other.team === from.team) continue
    const t =
      ((other.position.x - from.position.x) * dx +
        (other.position.z - from.position.z) * dz) /
      lenSq
    if (t <= 0.05 || t >= 0.95) continue
    const px = from.position.x + dx * t
    const pz = from.position.z + dz * t
    if (
      Math.hypot(other.position.x - px, other.position.z - pz) < LANE_CLEARANCE
    ) {
      return false
    }
  }
  return true
}

/**
 * Pick a team-mate to pass to. Only returns someone the ball can actually reach
 * — a blocked lane is no pass at all, which is what stops the AI firing the
 * ball into a defender's shins every 1.1 seconds.
 */
function chooseBestPassTarget(
  rec: PlayerRecord,
  requireClearLane = true,
): PlayerRecord | null {
  const dir = attackDir(rec)
  let best: PlayerRecord | null = null
  let bestScore = -Infinity
  for (const other of playerRegistry.values()) {
    if (other.team !== rec.team || other.id === rec.id || other.isGoalkeeper) continue
    const dist = rec.position.distanceTo(other.position)
    if (dist < 3 || dist > 28) continue
    if (requireClearLane && !laneIsClear(rec, other)) continue
    const progress = (rec.position.z - other.position.z) * dir
    const open = Math.min(
      nearestOpponentDistance(rec.team, other.position.x, other.position.z),
      12,
    )
    // The user asking for the ball outweighs almost everything else.
    const called = callState.byId === other.id && performance.now() / 1000 < callState.untilTime
    const score =
      progress * 1.1 + open * 1.4 - dist * 0.25 + (called ? 25 : 0)
    if (score > bestScore) {
      bestScore = score
      best = other
    }
  }
  return best
}

/**
 * What an AI player does with the ball when it is in kicking range.
 *
 * The guiding rule is: **keeping the ball is the default, kicking needs a
 * reason.** The old version kicked whenever the cooldown allowed and the ball
 * was in range, whose fallback was "blast it at the goal" — which is why loose
 * balls used to fly off in random directions and out of play.
 *
 * Returns true if a kick was struck, so the caller can play the animation and
 * start the cooldown.
 */
export function computeAiKick(
  rec: PlayerRecord,
  kick: (target: THREE.Vector3, power: number, scatter: number) => boolean,
  pass: (receiver: PlayerRecord) => boolean,
): boolean {
  const possessorId = dribbleState.possessorId
  const possessor = possessorId ? playerRegistry.get(possessorId) : null
  const now = performance.now() / 1000

  // Discipline: NEVER kick a ball a team-mate is carrying. This is what used to
  // knock the ball off the user's own feet.
  if (possessor && possessor.team === rec.team && possessor.id !== rec.id) {
    return false
  }

  // A player who has just received the ball is protected for a moment, so
  // passes actually connect instead of being poked away on arrival.
  if (possessor && possessor.id !== rec.id && now < dribbleState.protectedUntil) {
    return false
  }

  const tune = tuning()
  const goalZ = attackGoalZ(rec)

  if (possessor?.id === rec.id) {
    // A keeper who has gathered the ball always distributes it.
    if (rec.isGoalkeeper) {
      const receiver =
        chooseBestPassTarget(rec) ?? chooseBestPassTarget(rec, false)
      if (receiver) return pass(receiver)
      _goalTarget.set(rec.ai.jitterX * 4, 0, goalZ)
      return kick(_goalTarget, 11, tune.shotScatter)
    }

    // Shoot only from a real shooting position: close enough AND from an angle
    // where the goal is actually available.
    const dz = Math.abs(rec.position.z - goalZ)
    const distToGoal = Math.hypot(rec.position.x, dz)
    const angle = Math.atan2(Math.abs(rec.position.x), Math.max(0.1, dz))
    if (distToGoal < AI_SHOOT_RANGE && angle < AI_SHOOT_ANGLE) {
      // Aim inside a post rather than at the corner flag.
      const side = Math.random() < 0.5 ? -1 : 1
      _goalTarget.set(side * HALF_GOAL_W * 0.55, 0, goalZ)
      // Enough to beat the keeper from this range without rocketing the ball
      // into the next postcode — the pitch is only 72 m long.
      const power = THREE.MathUtils.clamp(distToGoal * 0.55, 6, 11)
      return kick(_goalTarget, power, tune.shotScatter)
    }

    // Take a real beat on the ball before looking to release it. Offloading the
    // instant you win possession is what made every AI touch feel like a panic
    // clearance; a settled carrier who runs at the defence reads far better.
    const held = now - dribbleState.possessorSince
    const called = callState.byId !== null && now < callState.untilTime
    const pressured = underPressure(rec)
    const settled = held >= MIN_CARRY_TIME

    if (called || pressured || (settled && Math.random() < tune.passTendency)) {
      const receiver = chooseBestPassTarget(rec)
      // An AI team-mate's pass must never yank control away from the player
      // the user is driving, so these are always registered as not-by-user.
      if (receiver) return pass(receiver)
    }

    // Nothing on: keep the ball and run with it. Movement handles the rest.
    return false
  }

  if (possessor && possessor.team !== rec.team) {
    // Opponent is carrying: nick the ball off them. Aim the poke back toward
    // our own half rather than hoofing it — a tackle is not a clearance.
    _goalTarget.set(rec.position.x * 0.5, 0, rec.position.z + attackDir(rec) * 6)
    return kick(_goalTarget, 3.5, tune.shotScatter)
  }

  // --- Loose ball ----------------------------------------------------------
  // The important change: DO NOT blast it. Take possession instead — just
  // arriving is enough, the possession system will pick the ball up. Only
  // actually strike it if we're under real pressure and can't settle.
  if (!underPressure(rec)) return false

  const outlet = chooseBestPassTarget(rec)
  if (outlet) return pass(outlet)

  // Genuinely stuck: clear it, but upfield-ish and at a controlled weight. The
  // power clamp in aiKick keeps it inside the pitch.
  _goalTarget.set(rec.ai.jitterX * 2, 0, rec.position.z + attackDir(rec) * 14)
  return kick(_goalTarget, 8, tune.shotScatter)
}

/** The AI speed factor for the current difficulty. */
export function aiSpeedFactorNow(): number {
  return tuning().aiSpeedFactor
}

// ---------------------------------------------------------------------------

/**
 * Clamp a target to the band this player's role is allowed to occupy.
 *
 * Bands are authored for a team defending -Z (see ROLE_BANDS), so the away side
 * — which defends +Z — reads them mirrored. A player already outside their band
 * is pulled back toward it rather than frozen, so recovery looks like running
 * back into position instead of a snap.
 */
function clampToRoleBand(rec: PlayerRecord, targetZ: number): number {
  if (rec.isGoalkeeper) return targetZ
  const band = ROLE_BANDS[rec.role]
  const attacking = teamPhase[rec.team] === 'attack'
  const lo = attacking ? band.attackMin : band.defendMin
  const hi = attacking ? band.attackMax : band.defendMax

  // Band space runs -1 (own goal line) → +1 (opponent's). Home attacks -Z so
  // dir = -1 and band f maps to world -f·HALF_L; away attacks +Z so dir = +1
  // and f maps to +f·HALF_L. Both are `f · dir · HALF_L`.
  const dir = attackDir(rec) // -1 for home, +1 for away
  const a = lo * dir * HALF_L
  const b = hi * dir * HALF_L
  return THREE.MathUtils.clamp(targetZ, Math.min(a, b), Math.max(a, b))
}

/**
 * Point the movement vector at a target. Within ARRIVE_RADIUS the input is
 * scaled down instead of cut dead, so players ease onto their mark rather than
 * oscillating around it.
 *
 * Every behaviour routes through here, so the role band is enforced in exactly
 * one place rather than being re-checked in seven.
 */
const ARRIVE_RADIUS = 2.2
const STOP_RADIUS = 0.35

export function steerToward(
  rec: PlayerRecord,
  target: THREE.Vector3,
  input: InputState,
): void {
  const halfW = HALF_W - 1
  const halfL = HALF_L + 2
  const clampedX = THREE.MathUtils.clamp(target.x, -halfW, halfW)
  const clampedZ = THREE.MathUtils.clamp(
    clampToRoleBand(rec, target.z),
    -halfL,
    halfL,
  )
  const dx = clampedX - rec.position.x
  const dz = clampedZ - rec.position.z
  const dist = Math.hypot(dx, dz)
  if (dist < STOP_RADIUS) {
    input.moveDirection.set(0, 0)
    return
  }
  input.moveDirection.set(dx / dist, dz / dist)
  if (dist < ARRIVE_RADIUS) {
    // Ease in: shorter vector = lower target speed in the controller.
    const ease = dist / ARRIVE_RADIUS
    input.moveDirection.multiplyScalar(ease)
    input.sprinting = false
  }
}
