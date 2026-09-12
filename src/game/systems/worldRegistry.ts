import * as THREE from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import type { PlayerPosition } from '@/game/state/types'

export type TeamSide = 'home' | 'away'

export interface AiState {
  /** Fraction of top speed this AI player runs at. */
  speed: number
  /** Wandering offset added to the AI's target, refreshed periodically. */
  jitterX: number
  jitterZ: number
  nextJitterAt: number
  /** The AI won't react to a new loose ball until this time (reaction delay). */
  reactUntil: number
  /** Set while this player is the user's selected teammate: break into space. */
  makeRun: boolean
  /** Perf-clock seconds until which a keeper's dive pose plays. */
  diveUntil: number
  /** -1 dive left, +1 dive right, 0 = stay central and spread. */
  diveSide: number
  /** 0 = grounded dive, 0.5 = level, 1 = full-stretch high. */
  diveHeight: number
  /** Extra speed multiplier (keepers get one while diving). */
  speedBoost: number
  /** Cached SupportRun destination, refreshed on a timer to avoid dithering. */
  runX: number
  runZ: number
  nextRunAt: number
  /** What this player decided to do this frame — shown by the debug labels. */
  behaviour: Behaviour
}

/** The named behaviours an AI player can be in. Also drives the intent labels. */
export type Behaviour =
  | 'idle'
  | 'you'
  | 'carry'
  | 'chase'
  | 'support'
  | 'press'
  | 'cover'
  | 'intercept'
  | 'shape'
  | 'keeper'
  | 'walkout'

/**
 * Slide-tackle bookkeeping. Slides chain: you get three in a row, and the
 * fourth is refused until the chain has had time to lapse.
 */
export interface SlideState {
  /** Perf-clock seconds until which the slide pose and hitbox are live. */
  activeUntil: number
  /** Perf-clock seconds before which a new slide is refused. */
  readyAt: number
  /** How many slides have been made back to back. */
  chain: number
  /** When the last slide started, used to lapse the chain. */
  lastAt: number
  /** Opponents already hit by the current slide, so one slide hits once. */
  hit: Set<string>
}

export function makeSlideState(): SlideState {
  return { activeUntil: 0, readyAt: 0, chain: 0, lastAt: 0, hit: new Set() }
}

export interface PlayerRecord {
  id: string
  team: TeamSide
  /** Formation role, which decides how far up and back this player may roam. */
  role: PlayerPosition
  /** Index into the formation's slot list, used for the roam band. */
  slot: number
  isGoalkeeper: boolean
  /** Live world position, updated every frame by the entity. */
  position: THREE.Vector3
  /** Live facing yaw (radians), updated every frame by the entity. */
  yaw: number
  spawn: [number, number, number]
  /** Index of this player's formation slot, used for line-ups and ordering. */
  slotIndex: number
  rigidBody: RapierRigidBody | null
  ai: AiState
  slide: SlideState
  /** Perf-clock seconds until which this player is on the floor and cannot move. */
  knockedUntil: number
}

/**
 * Module-level registry of live match objects. Entities register themselves on
 * mount and update their position refs each frame, so AI/camera/rules systems
 * can read world state without React re-renders.
 */
export const playerRegistry = new Map<string, PlayerRecord>()

export const ballApi: { body: RapierRigidBody | null } = { body: null }

/**
 * Ball-carry state. `possessorId` is whoever currently controls the ball at
 * their feet; `releaseUntil` briefly disables the carry after a kick so the
 * ball actually leaves.
 */
export const dribbleState: {
  possessorId: string | null
  releaseUntil: number
  /**
   * A player who has just received the ball is protected for a moment: nobody
   * may tackle it off them. Without this, passes get poked away the instant
   * they arrive and passing never feels like it worked.
   */
  protectedUntil: number
  /** Which side touched the ball last, so out-of-play can be awarded properly. */
  lastTouchTeam: TeamSide | null
  /** Perf-clock seconds at which the current possessor won the ball. */
  possessorSince: number
} = {
  possessorId: null,
  releaseUntil: 0,
  protectedUntil: 0,
  lastTouchTeam: null,
  possessorSince: 0,
}

/**
 * The user is asking for the ball. An AI team-mate carrying it will look to
 * play them in while this is live.
 */
export const callState: { untilTime: number; byId: string | null } = {
  untilTime: 0,
  byId: null,
}

/**
 * Whether each side is currently attacking or defending. Drives the role bands,
 * so a defender knows to drop when the ball is lost and push up when it's won.
 * Updated with hysteresis by the possession controller so a scrappy loose ball
 * doesn't make the whole shape flap back and forth.
 */
export type TeamPhase = 'attack' | 'defend'

export const teamPhase: Record<TeamSide, TeamPhase> = {
  home: 'defend',
  away: 'defend',
}

/**
 * A pass currently travelling between two players. Control transfers to
 * `targetId` when it arrives; an opponent reaching the ball first is an
 * interception and control stays with the passer.
 */
export const passState: {
  active: boolean
  /** True only for a pass played by the human-controlled player. */
  byUser: boolean
  fromId: string | null
  targetId: string | null
  /** Perf-clock seconds after which an unreceived pass is considered dead. */
  expiresAt: number
  /** Where the pass was struck from, for interception lane maths. */
  origin: THREE.Vector3
  /** Where the receiver was standing when it was struck. */
  target: THREE.Vector3
} = {
  active: false,
  byUser: false,
  fromId: null,
  targetId: null,
  expiresAt: 0,
  origin: new THREE.Vector3(),
  target: new THREE.Vector3(),
}

export function clearPass(): void {
  passState.active = false
  passState.byUser = false
  passState.fromId = null
  passState.targetId = null
  passState.expiresAt = 0
}

/** Nearest player of any team to the ball within `radius`, optionally incl. GK. */
export function nearestPlayerToBall(
  radius: number,
  includeGk = true,
): PlayerRecord | null {
  const ball = ballPosition(_scratch)
  if (!ball) return null
  let best: PlayerRecord | null = null
  let bestDist = radius * radius
  for (const rec of playerRegistry.values()) {
    if (!includeGk && rec.isGoalkeeper) continue
    const d = rec.position.distanceToSquared(ball)
    if (d < bestDist) {
      bestDist = d
      best = rec
    }
  }
  return best
}

export function ballPosition(out = new THREE.Vector3()): THREE.Vector3 | null {
  const body = ballApi.body
  if (!body) return null
  const t = body.translation()
  return out.set(t.x, t.y, t.z)
}

export function ballVelocity(out = new THREE.Vector3()): THREE.Vector3 | null {
  const body = ballApi.body
  if (!body) return null
  const v = body.linvel()
  return out.set(v.x, v.y, v.z)
}

const _scratch = new THREE.Vector3()

/** Is this player the closest member of their team to the ball? */
export function isClosestTeammateToBall(id: string): boolean {
  const self = playerRegistry.get(id)
  const ball = ballPosition(_scratch)
  if (!self || !ball) return false
  const own = self.position.distanceToSquared(ball)
  for (const rec of playerRegistry.values()) {
    if (rec.team !== self.team || rec.id === id || rec.isGoalkeeper) continue
    if (rec.position.distanceToSquared(ball) < own) return false
  }
  return true
}
