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
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import { shotMultiplier } from "@/game/data/teamStrength";
import { useGameStore } from "@/game/state/gameStore";

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
  accurateRange,
  longRangePowerFloor,
  longRangeScatter,
  mass,
  linearDamping,
} = PHYSICS_CONFIG.ball;

/** Record which side touched the ball last, so out-of-play can be awarded. */
function markTouch(id: string): void {
  const rec = playerRegistry.get(id);
  if (rec) dribbleState.lastTouchTeam = rec.team;
}

/** The nation id a player is representing. */
function teamIdOf(rec: PlayerRecord): string {
  const st = useGameStore.getState();
  return rec.team === "home" ? st.homeTeamId : st.awayTeamId;
}

/** Distance from a player to the goal they are attacking. */
export function distanceToAttackingGoal(rec: PlayerRecord): number {
  const goalZ =
    rec.team === "home"
      ? -FIELD_DIMENSIONS.length / 2
      : FIELD_DIMENSIONS.length / 2;
  return Math.hypot(rec.position.x, rec.position.z - goalZ);
}

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
 * Distance falloff for shots. Inside `accurateRange` a strike is at full power
 * and dead straight; past it, power bleeds away toward `longRangePowerFloor`
 * and aim scatter grows. This is what makes working the ball into the box worth
 * doing — a hopeful effort from 30 m should be a gamble, not the default play.
 *
 * `t` is 0 at the accurate range and 1 at the longest a shot can carry.
 */
export function shotFalloff(distanceToGoal: number): {
  powerScale: number;
  scatter: number;
} {
  const maxRange = travelDistance(maxShotImpulse);
  if (distanceToGoal <= accurateRange || maxRange <= accurateRange) {
    return { powerScale: 1, scatter: 0 };
  }
  const t = THREE.MathUtils.clamp(
    (distanceToGoal - accurateRange) / (maxRange - accurateRange),
    0,
    1,
  );
  return {
    powerScale: THREE.MathUtils.lerp(1, longRangePowerFloor, t),
    scatter: longRangeScatter * t,
  };
}

/** How far a ground ball carries for a given impulse before damping stops it. */
export function travelDistance(impulse: number): number {
  return impulse / mass / linearDamping;
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

  // Direction ALWAYS comes from the way the player is facing. The drag on the
  // shoot circle sets power and nothing else, so pulling right while running
  // left still strikes the ball to the left — which is what you were watching
  // your player do, and therefore what you expect.
  facingVector(yaw, _dir);

  // Long-range efforts lose power and drift. Distance is measured to the goal
  // being attacked, not to wherever the stick happens to point.
  const self = playerRegistry.get(selfId);
  const { powerScale, scatter } = shotFalloff(
    self ? distanceToAttackingGoal(self) : 0,
  );
  if (scatter > 0) {
    _dir.applyAxisAngle(_up, (Math.random() - 0.5) * 2 * scatter);
  }

  const drive =
    THREE.MathUtils.lerp(minShotImpulse, maxShotImpulse, power) *
    powerScale *
    (self ? shotMultiplier(teamIdOf(self)) : 1);
  _impulse.copy(_dir).multiplyScalar(drive);
  // Every shot stays on the deck. Lofted shots were tried and were far harder to
  // read and control than they were worth.
  _impulse.y = 0;

  ball.applyImpulse(_impulse, true);
  markKick(selfId);
  markTouch(selfId);
  releaseBall();
  return true;
}

/** How far a flick carries forward, and how high it goes over. */
const FLICK_FORWARD = 6.5;
const FLICK_LIFT = 5.2;
/** Seconds after a flick during which the ball cannot be tackled away. */
const FLICK_PROTECT = 1.1;

/**
 * Rainbow flick: scoop the ball up over your own head and land it in front of
 * you, past whoever was standing there.
 *
 * This is the one deliberately airborne kick in the game. It exists because a
 * defender who is simply standing in the lane has no answer to it — but it is
 * slow, and anybody arriving at pace from the side will beat it, which is what
 * stops it becoming the only move worth using.
 */
export function tryFlick(
  ball: RapierRigidBody,
  selfId: string,
  playerPos: THREE.Vector3,
  yaw: number,
): boolean {
  if (!kickReady(selfId)) return false;
  if (horizontalDistanceToBall(playerPos, ball) > kickRange) return false;

  facingVector(yaw, _dir);
  const forward = powerForDistance(FLICK_FORWARD);
  _impulse.copy(_dir).multiplyScalar(forward);
  _impulse.y = FLICK_LIFT * mass;
  ball.applyImpulse(_impulse, true);

  markKick(selfId);
  markTouch(selfId);
  releaseBall();
  // The flicker keeps the ball: the whole point is that it stays yours.
  dribbleState.protectedUntil = performance.now() / 1000 + FLICK_PROTECT;
  return true;
}

/**
 * The impulse that carries the ball a given distance before damping stops it.
 *
 * Rapier applies linear damping as an exponential decay, so a ball launched at
 * speed v decays as v·e^(−d·t) and total distance converges on v/d, where
 * v = impulse/mass. With the current tuning an "impulse 9" clearance carries
 * about 36 m — half the pitch — which is exactly why AI clearances used to sail
 * straight out of play.
 */
function powerForDistance(distance: number): number {
  return distance * mass * linearDamping;
}

/**
 * Largest distance the ball can travel from `origin` along `dir` and still come
 * to rest inside the pitch, with a margin so it never trickles over the line.
 */
function distanceToBoundary(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
): number {
  const limitX = FIELD_DIMENSIONS.width / 2 - 2;
  const limitZ = FIELD_DIMENSIONS.length / 2 - 2;
  let best = Infinity;
  if (Math.abs(dx) > 1e-4) {
    best = Math.min(best, ((dx > 0 ? limitX : -limitX) - ox) / dx);
  }
  if (Math.abs(dz) > 1e-4) {
    best = Math.min(best, ((dz > 0 ? limitZ : -limitZ) - oz) / dz);
  }
  return Math.max(0, best);
}

/**
 * AI kick: if the ball is in range, strike it toward a target point with a bit
 * of aim scatter so AI kicks aren't laser-perfect.
 *
 * Power is capped so the ball comes to rest INSIDE the pitch. Without this the
 * AI's clearances routinely sailed straight out, which on top of a restart is
 * what made matches feel like they never got going.
 *
 * Returns true if the kick connected (for animation + cooldown).
 */
export function aiKick(
  ball: RapierRigidBody,
  selfId: string,
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

  // Cap the power to what stays in play along the (post-scatter) direction.
  const room = distanceToBoundary(t.x, t.z, _dir.x, _dir.z);
  const capped = Math.min(power, powerForDistance(room));
  // A kick with no room at all is pointless — don't take it.
  if (capped < 1.5) return false;

  _impulse.copy(_dir).multiplyScalar(capped);
  _impulse.y = 0; // AI keeps it on the deck
  ball.applyImpulse(_impulse, true);
  markKick(selfId);
  markTouch(selfId);
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
  markTouch(selfId);
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
