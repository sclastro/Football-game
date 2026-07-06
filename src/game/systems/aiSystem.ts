import * as THREE from 'three'
import type { InputState } from './inputSystem'
import {
  ballPosition,
  isClosestTeammateToBall,
  type PlayerRecord,
} from './worldRegistry'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'

/** How close the ball must be before a non-designated chaser presses anyway. */
const PRESS_RADIUS = 6
/** Chasers further than this from the ball sprint. */
const SPRINT_DISTANCE = 7
/** GK stays within this x of the goal centre. */
const GK_LATERAL_LIMIT = 4.5
/** GK rushes the ball when it comes this close to their goal. */
const GK_RUSH_RADIUS = 5

const _ball = new THREE.Vector3()
const _target = new THREE.Vector3()

/**
 * Simple scripted AI, one call per frame per player. Produces the same
 * InputState shape the human controller uses, so both share the movement code.
 *
 * Outfield: the teammate closest to the ball chases it; everyone else holds
 * their formation spot, shaded slightly toward the ball. GK: tracks the ball
 * laterally along the goal line and rushes it inside the box.
 */
export function computeAiInput(rec: PlayerRecord, input: InputState): InputState {
  input.sprinting = false
  input.shootHeld = false
  input.shootCharge = 0
  input.shootReleased = false
  input.moveDirection.set(0, 0)

  const ball = ballPosition(_ball)
  if (!ball) return input

  if (rec.isGoalkeeper) {
    return goalkeeperInput(rec, ball, input)
  }

  const distToBall = rec.position.distanceTo(ball)
  const shouldChase = isClosestTeammateToBall(rec.id) || distToBall < PRESS_RADIUS

  if (shouldChase) {
    _target.copy(ball)
    input.sprinting = distToBall > SPRINT_DISTANCE
  } else {
    // Hold formation, shaded 25% toward the ball so the shape breathes.
    _target.set(
      rec.spawn[0] + (ball.x - rec.spawn[0]) * 0.25,
      0,
      rec.spawn[2] + (ball.z - rec.spawn[2]) * 0.25,
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
  const goalZ = rec.spawn[2] // GK spawns on their goal line
  const distToBall = rec.position.distanceTo(ball)
  const ballNearGoal =
    Math.abs(ball.z - goalZ) < GK_RUSH_RADIUS && Math.abs(ball.x) < GK_LATERAL_LIMIT + 2

  if (ballNearGoal && distToBall < GK_RUSH_RADIUS) {
    _target.copy(ball)
    input.sprinting = true
  } else {
    const trackX = THREE.MathUtils.clamp(ball.x, -GK_LATERAL_LIMIT, GK_LATERAL_LIMIT)
    _target.set(trackX, 0, goalZ)
  }

  steerToward(rec, _target, input)
  return input
}

/** Point the movement vector at the target; dead-zone stops jittering on spot. */
function steerToward(
  rec: PlayerRecord,
  target: THREE.Vector3,
  input: InputState,
): void {
  const dx = target.x - rec.position.x
  const dz = target.z - rec.position.z
  const dist = Math.hypot(dx, dz)
  if (dist < 0.35) return

  const halfW = FIELD_DIMENSIONS.width / 2 - 1
  const halfL = FIELD_DIMENSIONS.length / 2 - 1
  // Never steer out of bounds even if the ball ends up in a corner.
  const clampedX = THREE.MathUtils.clamp(target.x, -halfW, halfW)
  const clampedZ = THREE.MathUtils.clamp(target.z, -halfL, halfL)
  input.moveDirection.set(clampedX - rec.position.x, clampedZ - rec.position.z)
  input.moveDirection.normalize()
}
