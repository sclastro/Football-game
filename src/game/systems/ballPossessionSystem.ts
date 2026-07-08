import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { InputState } from "./inputSystem";
import {
  playerRegistry,
  passState,
  type PlayerRecord,
} from "./worldRegistry";

const {
  kickRange,
  minShotImpulse,
  maxShotImpulse,
  maxChargeTime,
  passCooldown,
} = PHYSICS_CONFIG.ball;

/** Timestamp (s) of the last pass/shot, so kicks can't be spammed. */
const kickClock = { lastKickAt: 0 };

function kickReady(): boolean {
  return performance.now() / 1000 - kickClock.lastKickAt >= passCooldown;
}
function markKick(): void {
  kickClock.lastKickAt = performance.now() / 1000;
}

/** Facing unit vector on the XZ plane for a given yaw (matches player forward). */
export function facingVector(yaw: number, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

const _dir = new THREE.Vector3();
const _impulse = new THREE.Vector3();

/** Horizontal distance from a player position to the ball. */
export function horizontalDistanceToBall(
  playerPos: THREE.Vector3,
  ball: RapierRigidBody,
): number {
  const t = ball.translation();
  const dx = t.x - playerPos.x;
  const dz = t.z - playerPos.z;
  return Math.hypot(dx, dz);
}

/**
 * On shoot-key release, if the ball is within kick range, launch it along the
 * player's facing direction with power scaled by how long the key was charged.
 * Returns true if a shot was actually fired (for triggering a kick animation).
 */
export function tryShoot(
  ball: RapierRigidBody,
  playerPos: THREE.Vector3,
  yaw: number,
  input: InputState,
): boolean {
  if (!input.shootReleased) return false;
  if (!kickReady()) return false;
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const charge = THREE.MathUtils.clamp(input.shootCharge / maxChargeTime, 0, 1);
  const power = THREE.MathUtils.lerp(minShotImpulse, maxShotImpulse, charge);

  facingVector(yaw, _dir);
  _impulse.copy(_dir).multiplyScalar(power);
  // Ground shot: keep the ball down so it's controllable (no lofted shots).
  _impulse.y = 0;

  ball.applyImpulse(_impulse, true);
  markKick();
  return true;
}

/**
 * AI kick: if the ball is in range, punt it toward a target point (usually the
 * opponent goal) with a bit of aim scatter so AI shots aren't laser-perfect.
 * Returns true if the kick connected (for animation + cooldown).
 */
export function aiKick(
  ball: RapierRigidBody,
  playerPos: THREE.Vector3,
  target: THREE.Vector3,
  power: number,
): boolean {
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const t = ball.translation();
  _dir.set(target.x - t.x, 0, target.z - t.z);
  if (_dir.lengthSq() < 0.001) return false;
  _dir.normalize();

  // Aim scatter: up to ~5 degrees either way.
  const scatter = (Math.random() - 0.5) * 0.18;
  _dir.applyAxisAngle(_up, scatter);

  _impulse.copy(_dir).multiplyScalar(power);
  _impulse.y = 0; // ground ball
  ball.applyImpulse(_impulse, true);
  return true;
}

const _up = new THREE.Vector3(0, 1, 0);
const _toMate = new THREE.Vector3();
const _facing = new THREE.Vector3();

/** Pass reach and power tuning. */
const PASS_MIN_DIST = 2;
const PASS_MAX_DIST = 26;
const PASS_CONE_DEG = 75;

/**
 * Pick the best teammate to receive a pass: prefer the smallest angle off the
 * passer's facing direction within a cone, tie-broken toward shorter passes.
 * Falls back to the nearest teammate if nobody is inside the cone.
 * Goalkeepers are never receivers (control never switches to the GK).
 */
export function choosePassReceiver(
  selfId: string,
  playerPos: THREE.Vector3,
  yaw: number,
): PlayerRecord | null {
  const self = playerRegistry.get(selfId);
  if (!self) return null;

  facingVector(yaw, _facing);
  const coneRad = (PASS_CONE_DEG * Math.PI) / 180;

  let bestInCone: PlayerRecord | null = null;
  let bestScore = Infinity;
  let nearest: PlayerRecord | null = null;
  let nearestDist = Infinity;

  for (const rec of playerRegistry.values()) {
    if (rec.team !== self.team || rec.id === selfId || rec.isGoalkeeper) continue;

    _toMate.subVectors(rec.position, playerPos);
    _toMate.y = 0;
    const dist = _toMate.length();
    if (dist < PASS_MIN_DIST || dist > PASS_MAX_DIST) continue;

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = rec;
    }

    _toMate.normalize();
    const angle = _facing.angleTo(_toMate);
    if (angle > coneRad) continue;

    // Angle dominates; slight preference for closer targets.
    const score = angle * 2 + dist * 0.03;
    if (score < bestScore) {
      bestScore = score;
      bestInCone = rec;
    }
  }

  return bestInCone ?? nearest;
}

/**
 * Kick the ball toward a teammate with distance-scaled power and register the
 * pass for auto-switch. Returns true if the pass was struck.
 */
export function tryPass(
  ball: RapierRigidBody,
  selfId: string,
  playerPos: THREE.Vector3,
  yaw: number,
): boolean {
  if (!kickReady()) return false;
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const receiver = choosePassReceiver(selfId, playerPos, yaw);
  if (!receiver) return false;

  const t = ball.translation();
  _dir.set(receiver.position.x - t.x, 0, receiver.position.z - t.z);
  const dist = _dir.length();
  if (dist < 0.5) return false;
  _dir.normalize();

  // Enough pace to arrive briskly, gentle enough to be controllable. Ground ball.
  const power = THREE.MathUtils.clamp(dist * 0.5, 3, 9.5);
  _impulse.copy(_dir).multiplyScalar(power);
  _impulse.y = 0;
  ball.applyImpulse(_impulse, true);
  markKick();

  passState.receiverId = receiver.id;
  passState.expiresAt = performance.now() / 1000 + 2.5;
  return true;
}
