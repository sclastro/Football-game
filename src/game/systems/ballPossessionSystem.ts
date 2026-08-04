import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { InputState } from "./inputSystem";
import {
  playerRegistry,
  dribbleState,
  passState,
  type PlayerRecord,
} from "./worldRegistry";

/** Seconds the ball is free of carry control after a kick, so it can leave. */
const RELEASE_TIME = 0.4;
function releaseBall() {
  dribbleState.releaseUntil = performance.now() / 1000 + RELEASE_TIME;
}

const {
  kickRange,
  minShotImpulse,
  maxShotImpulse,
  maxChargeTime,
  passCooldown,
  loftThreshold,
  maxLiftImpulse,
} = PHYSICS_CONFIG.ball;

/**
 * Timestamp (s) of each player's last kick, so kicks can't be spammed. This is
 * PER PLAYER — a single shared cooldown meant one player's pass silently
 * blocked every other player's for the whole cooldown window.
 */
const lastKickAt = new Map<string, number>();

function kickReady(id: string): boolean {
  return performance.now() / 1000 - (lastKickAt.get(id) ?? 0) >= passCooldown;
}
function markKick(id: string): void {
  lastKickAt.set(id, performance.now() / 1000);
}

/** Facing unit vector on the XZ plane for a given yaw (matches player forward). */
export function facingVector(yaw: number, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

const _dir = new THREE.Vector3();
const _impulse = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _toMate = new THREE.Vector3();
const _facing = new THREE.Vector3();

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
 * How much lift a shot gets for a given 0..1 power. Below the threshold a shot
 * stays flat on the deck (short strikes remain easy to control, which is what
 * the ground-only rule was protecting); past it the arc ramps in quadratically,
 * so only a big pull sends it up and long.
 */
export function liftForPower(power: number): number {
  if (power <= loftThreshold) return 0;
  const t = (power - loftThreshold) / (1 - loftThreshold);
  return maxLiftImpulse * t * t;
}

/**
 * On shoot release, if the ball is in range, launch it. Power comes from the
 * charge (keyboard) or drag length (touch); direction comes from the touch
 * stick's aim when present, otherwise from the player's facing.
 * Returns true if a shot was actually fired (for triggering a kick animation).
 */
export function tryShoot(
  ball: RapierRigidBody,
  selfId: string,
  playerPos: THREE.Vector3,
  yaw: number,
  input: InputState,
): boolean {
  if (!input.shootReleased) return false;
  if (!kickReady(selfId)) return false;
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const power = THREE.MathUtils.clamp(input.shootCharge / maxChargeTime, 0, 1);
  const drive = THREE.MathUtils.lerp(minShotImpulse, maxShotImpulse, power);

  // The touch stick can aim independently of where the player is facing, so you
  // can strike to the right while sprinting left.
  if (input.hasShootAim && (input.shootAimX !== 0 || input.shootAimZ !== 0)) {
    _dir.set(input.shootAimX, 0, input.shootAimZ).normalize();
  } else {
    facingVector(yaw, _dir);
  }
  _impulse.copy(_dir).multiplyScalar(drive);
  _impulse.y = liftForPower(power);

  ball.applyImpulse(_impulse, true);
  markKick(selfId);
  releaseBall();
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
  scatter = 1,
): boolean {
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const t = ball.translation();
  _dir.set(target.x - t.x, 0, target.z - t.z);
  if (_dir.lengthSq() < 0.001) return false;
  _dir.normalize();

  // Aim scatter: up to ~5 degrees either way at scatter = 1.
  _dir.applyAxisAngle(_up, (Math.random() - 0.5) * 0.18 * scatter);

  _impulse.copy(_dir).multiplyScalar(power);
  _impulse.y = 0; // AI keeps it on the deck
  ball.applyImpulse(_impulse, true);
  releaseBall();
  return true;
}

/** Pass reach and power tuning. */
const PASS_MIN_DIST = 2;
const PASS_MAX_DIST = 34;
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
 * Strike a ground pass at a specific team-mate and register it as a pass in
 * flight, so the possession system can transfer control on arrival — or detect
 * that an opponent cut it out.
 *
 * `byUser` marks a pass played by the human-controlled player; only those move
 * the camera and control to the receiver. AI teammates passing among themselves
 * must never yank control away from you.
 */
export function tryPassTo(
  ball: RapierRigidBody,
  selfId: string,
  playerPos: THREE.Vector3,
  receiver: PlayerRecord,
  byUser: boolean,
): boolean {
  if (!kickReady(selfId)) return false;
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  const t = ball.translation();
  // Lead the pass slightly so it arrives where the receiver is heading.
  _dir.set(receiver.position.x - t.x, 0, receiver.position.z - t.z);
  const dist = _dir.length();
  if (dist < 0.5) return false;
  _dir.normalize();

  // Enough pace to arrive briskly, gentle enough to be controllable. Ground
  // ball — passes never leave the deck, so they stay easy to receive.
  const power = THREE.MathUtils.clamp(dist * 0.55, 3.5, 13);
  _impulse.copy(_dir).multiplyScalar(power);
  _impulse.y = 0;
  ball.applyImpulse(_impulse, true);
  markKick(selfId);
  releaseBall();

  passState.active = true;
  passState.byUser = byUser;
  passState.fromId = selfId;
  passState.targetId = receiver.id;
  passState.origin.set(t.x, 0, t.z);
  passState.target.set(receiver.position.x, 0, receiver.position.z);
  passState.expiresAt =
    performance.now() / 1000 + THREE.MathUtils.clamp(dist / 5, 1, 5) + 1.5;
  return true;
}

/**
 * Pass to whoever the cone search likes best. Used when nothing is selected and
 * by the AI.
 */
export function tryPass(
  ball: RapierRigidBody,
  selfId: string,
  playerPos: THREE.Vector3,
  yaw: number,
  byUser = false,
): boolean {
  const receiver = choosePassReceiver(selfId, playerPos, yaw);
  if (!receiver) return false;
  return tryPassTo(ball, selfId, playerPos, receiver, byUser);
}
