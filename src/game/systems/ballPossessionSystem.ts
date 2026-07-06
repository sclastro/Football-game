import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { InputState } from "./inputSystem";

const {
  kickRange,
  minShotImpulse,
  maxShotImpulse,
  maxChargeTime,
  shotLift,
} = PHYSICS_CONFIG.ball;

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
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const charge = THREE.MathUtils.clamp(input.shootCharge / maxChargeTime, 0, 1);
  const power = THREE.MathUtils.lerp(minShotImpulse, maxShotImpulse, charge);

  facingVector(yaw, _dir);
  _impulse.copy(_dir).multiplyScalar(power);
  _impulse.y = power * shotLift;

  ball.applyImpulse(_impulse, true);
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
  _impulse.y = power * shotLift * 0.6; // AI keeps it lower than a charged shot
  ball.applyImpulse(_impulse, true);
  return true;
}

const _up = new THREE.Vector3(0, 1, 0);
