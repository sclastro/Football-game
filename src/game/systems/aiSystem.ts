import * as THREE from 'three'
import type { InputState } from './inputSystem'
import {
  ballPosition,
  dribbleState,
  isClosestTeammateToBall,
  playerRegistry,
  type PlayerRecord,
} from './worldRegistry'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'

/** Chasers further than this from the ball sprint (sometimes). */
const SPRINT_DISTANCE = 8
/** GK stays within this x of the goal centre. */
const GK_LATERAL_LIMIT = 3.4
/** GK rushes the ball when it comes this close to their goal. */
const GK_RUSH_RADIUS = 6

const _ball = new THREE.Vector3()
const _target = new THREE.Vector3()

/** Fresh randomised AI traits, so no two players behave identically. */
export function makeAiState() {
  return {
    speed: 0.9 + Math.random() * 0.14, // 0.90 - 1.04 of the AI base factor
    jitterX: 0,
    jitterZ: 0,
    nextJitterAt: 0,
    reactUntil: 0,
  }
}

/**
 * Simple, deliberately imperfect scripted AI (one call per frame per player).
 * Produces the same InputState the human uses, so both share movement code.
 * Outfield: only the closest teammate chases (with a reaction delay + wandering
 * noise); the rest hold a loose formation. GK: guards the near-post angle and
 * rushes shots inside the box.
 */
export function computeAiInput(rec: PlayerRecord, input: InputState): InputState {
  input.sprinting = false
  input.shootHeld = false
  input.shootCharge = 0
  input.shootReleased = false
  input.passPressed = false
  input.moveDirection.set(0, 0)

  const ball = ballPosition(_ball)
  if (!ball) return input

  const now = performance.now() / 1000
  const ai = rec.ai

  // Refresh the wandering offset every ~0.6-1.4s.
  if (now >= ai.nextJitterAt) {
    ai.jitterX = (Math.random() - 0.5) * 3
    ai.jitterZ = (Math.random() - 0.5) * 3
    ai.nextJitterAt = now + 0.6 + Math.random() * 0.8
  }

  if (rec.isGoalkeeper) {
    return goalkeeperInput(rec, ball, input)
  }

  // Who has the ball right now?
  const possessor = dribbleState.possessorId
    ? playerRegistry.get(dribbleState.possessorId)
    : null

  // I am carrying: dribble toward the goal I attack, drifting with the jitter
  // so runs curve naturally instead of tracking a laser line.
  if (possessor?.id === rec.id) {
    const attackZ =
      rec.team === 'home' ? -FIELD_DIMENSIONS.length / 2 : FIELD_DIMENSIONS.length / 2
    _target.set(ai.jitterX * 1.5, 0, attackZ)
    input.sprinting = true
    steerToward(rec, _target, input)
    return input
  }

  // A teammate is carrying: never crowd them. Hold shape, pushed toward the
  // attacking end to offer a passing option.
  if (possessor && possessor.team === rec.team) {
    const attackDir = rec.team === 'home' ? -1 : 1
    _target.set(
      rec.spawn[0] + (ball.x - rec.spawn[0]) * 0.1 + ai.jitterX,
      0,
      rec.spawn[2] + (ball.z - rec.spawn[2]) * 0.4 + attackDir * 4 + ai.jitterZ,
    )
    steerToward(rec, _target, input)
    return input
  }

  const closest = isClosestTeammateToBall(rec.id)

  if (closest) {
    // Reaction delay before committing to a newly-loose ball.
    if (ai.reactUntil === 0) ai.reactUntil = now + 0.12 + Math.random() * 0.33
    const reacting = now >= ai.reactUntil
    const distToBall = rec.position.distanceTo(ball)
    _target.set(
      ball.x + ai.jitterX * 0.25,
      0,
      ball.z + ai.jitterZ * 0.25,
    )
    // Sprint only sometimes, so pressing isn't relentless.
    input.sprinting = reacting && distToBall > SPRINT_DISTANCE && Math.random() > 0.35
    if (!reacting) {
      // Hesitate: hold still until the reaction window passes.
      return input
    }
  } else {
    ai.reactUntil = 0
    // Hold a loose formation, shaded toward the ball's along-pitch position,
    // plus wander so the shape isn't robotic.
    _target.set(
      rec.spawn[0] + (ball.x - rec.spawn[0]) * 0.15 + ai.jitterX,
      0,
      rec.spawn[2] + (ball.z - rec.spawn[2]) * 0.35 + ai.jitterZ,
    )
  }

  steerToward(rec, _target, input)
  return input
}

function goalkeeperInput(
  rec: PlayerRecord,
  ball: THREE.Vector3,
  input: InputState,
): InputState {
  const goalZ = rec.spawn[2]
  const frontDir = -Math.sign(goalZ) // toward the field centre
  const distToBall = rec.position.distanceTo(ball)
  const ballNear =
    Math.abs(ball.z - goalZ) < GK_RUSH_RADIUS + 2 &&
    Math.abs(ball.x) < GK_LATERAL_LIMIT + 3

  if (ballNear && distToBall < GK_RUSH_RADIUS) {
    // Rush the ball to smother the shot.
    _target.copy(ball)
    input.sprinting = true
  } else {
    // Guard the angle: track the ball's x (near-post bias) a step off the line.
    const trackX = THREE.MathUtils.clamp(
      ball.x * 0.75 + rec.ai.jitterX * 0.15,
      -GK_LATERAL_LIMIT,
      GK_LATERAL_LIMIT,
    )
    _target.set(trackX, 0, goalZ + frontDir * 1.2)
  }

  steerToward(rec, _target, input)
  return input
}

/** Point the movement vector at the target; a dead-zone stops on-spot jitter. */
function steerToward(
  rec: PlayerRecord,
  target: THREE.Vector3,
  input: InputState,
): void {
  const halfW = FIELD_DIMENSIONS.width / 2 - 1
  const halfL = FIELD_DIMENSIONS.length / 2 + 2
  const clampedX = THREE.MathUtils.clamp(target.x, -halfW, halfW)
  const clampedZ = THREE.MathUtils.clamp(target.z, -halfL, halfL)
  const dx = clampedX - rec.position.x
  const dz = clampedZ - rec.position.z
  if (Math.hypot(dx, dz) < 0.4) return
  input.moveDirection.set(dx, dz).normalize()
}
