import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { isPlayingPhase } from "@/game/state/types";
import {
  ballApi,
  ballPosition,
  clearPass,
  dribbleState,
  nearestPlayerToBall,
  passState,
  playerRegistry,
  teamPhase,
  type PlayerRecord,
} from "./worldRegistry";
import { clearSelection } from "./selectionSystem";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { audio } from "./audio";

const BALL_R = PHYSICS_CONFIG.ball.radius;
/** A player within this distance of the ball is in possession. */
const POSSESS_RADIUS = 1.35;
/** The carried ball sits this far ahead of the possessor's feet. */
const CARRY_DIST = 0.85;
/** Spring stiffness pulling the ball to the carry point. */
const CARRY_STIFFNESS = 12;
const MAX_CARRY_SPEED = 13;
/** A newcomer must be this much closer than the current carrier to steal it. */
const STEAL_MARGIN = 0.5;
/**
 * Seconds a fresh receiver is protected from being tackled. Without this a pass
 * gets poked away the instant it lands and passing never feels like it worked.
 */
const RECEIVE_PROTECT = 0.5;

const _carry = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _ball = new THREE.Vector3();

/**
 * Ball possession and pass resolution.
 *
 * Whoever is on the ball "carries" it at their feet (close-control dribbling)
 * instead of the ball pinging away on contact.
 *
 * Control does NOT follow the ball. It changes only when the user makes it
 * change: by completing a pass to a selected team-mate, or by tapping a
 * team-mate twice to take them over (see selectionSystem).
 */
export function PossessionController() {
  useFrame(() => {
    const body = ballApi.body;
    const state = useGameStore.getState();
    if (!body || !isPlayingPhase(state.phase)) {
      dribbleState.possessorId = null;
      return;
    }

    let possessor = nearestPlayerToBall(POSSESS_RADIUS, true);
    // Hysteresis: the current carrier keeps the ball unless someone is clearly
    // closer, so control and the ball don't flicker between two players.
    const ball = ballPosition(_ball);
    const prev = dribbleState.possessorId
      ? playerRegistry.get(dribbleState.possessorId)
      : null;
    if (prev && ball && possessor && possessor.id !== prev.id) {
      const dPrev = prev.position.distanceTo(ball);
      const dNew = possessor.position.distanceTo(ball);
      const protectedNow =
        performance.now() / 1000 < dribbleState.protectedUntil;
      // A fresh receiver keeps the ball outright for their protected window;
      // otherwise a newcomer needs to be clearly closer to take it.
      if (dPrev < POSSESS_RADIUS && (protectedNow || dPrev - dNew < STEAL_MARGIN)) {
        possessor = prev;
      }
    }
    // A change of possessor is a new touch, and earns a short protected window
    // so the ball can't be poked straight back off whoever just got it.
    if (possessor && possessor.id !== dribbleState.possessorId) {
      dribbleState.lastTouchTeam = possessor.team;
      dribbleState.protectedUntil = performance.now() / 1000 + RECEIVE_PROTECT;
      dribbleState.possessorSince = performance.now() / 1000;
    }
    dribbleState.possessorId = possessor ? possessor.id : null;

    updateTeamPhase(possessor);
    resolvePass(possessor, state.setControlledPlayer);

    // Carry the ball at the possessor's feet (unless a kick just released it).
    const now = performance.now() / 1000;
    if (possessor && now >= dribbleState.releaseUntil) {
      const fx = -Math.sin(possessor.yaw);
      const fz = -Math.cos(possessor.yaw);
      _carry.set(
        possessor.position.x + fx * CARRY_DIST,
        BALL_R,
        possessor.position.z + fz * CARRY_DIST,
      );
      const t = body.translation();
      _vel.set(
        (_carry.x - t.x) * CARRY_STIFFNESS,
        0,
        (_carry.z - t.z) * CARRY_STIFFNESS,
      );
      if (_vel.length() > MAX_CARRY_SPEED) _vel.setLength(MAX_CARRY_SPEED);
      const cur = body.linvel();
      // Preserve some existing pace so tackles/loose touches still feel physical.
      body.setLinvel({ x: _vel.x, y: cur.y, z: _vel.z }, true);
    }
  });

  return null;
}

/** A side must hold the ball this long before the shape commits to attacking. */
const PHASE_SWITCH_DELAY = 0.35;
const phaseTimer = { pendingFor: null as string | null, since: 0 };

/**
 * Set each side's attack/defend phase from who has the ball.
 *
 * The delay matters: a scrappy loose ball changes possessor several times a
 * second, and without hysteresis the whole shape would flap up and down the
 * pitch. A side only commits to attacking once it has genuinely settled on it.
 */
function updateTeamPhase(possessor: PlayerRecord | null): void {
  const now = performance.now() / 1000;
  const holder = possessor?.team ?? null;

  if (holder !== phaseTimer.pendingFor) {
    phaseTimer.pendingFor = holder;
    phaseTimer.since = now;
    return;
  }
  // A loose ball leaves the phases as they were — both sides keep their shape
  // until somebody actually establishes possession.
  if (!holder) return;
  if (now - phaseTimer.since < PHASE_SWITCH_DELAY) return;

  teamPhase.home = holder === "home" ? "attack" : "defend";
  teamPhase.away = holder === "away" ? "attack" : "defend";
}

/**
 * Decide what happened to a pass in flight. This is the ONLY place control ever
 * transfers as a result of the ball moving, and only for passes the user played.
 */
function resolvePass(
  possessor: PlayerRecord | null,
  setControlledPlayer: (id: string) => void,
): void {
  if (!passState.active) return;

  // Nobody has touched it yet — just watch for the pass going dead.
  if (!possessor) {
    if (performance.now() / 1000 > passState.expiresAt) clearPass();
    return;
  }

  if (possessor.id === passState.fromId) return; // still at the passer's feet

  const passer = passState.fromId ? playerRegistry.get(passState.fromId) : null;

  // Only a pass the USER played may disturb the user's selection or control.
  // An AI team-mate's pass completing must leave both untouched.
  const byUser = passState.byUser;

  if (possessor.id === passState.targetId) {
    // Received cleanly by the intended team-mate.
    if (byUser) {
      if (!possessor.isGoalkeeper) setControlledPlayer(possessor.id);
      clearSelection();
    }
    clearPass();
    return;
  }

  if (passer && possessor.team !== passer.team) {
    // Cut out by an opponent. Control stays with whoever played the pass.
    if (byUser) {
      audio.intercept();
      clearSelection();
    }
    clearPass();
    return;
  }

  // A different team-mate got there first — a deflection still belongs to your
  // team, so control follows to them.
  if (byUser) {
    if (!possessor.isGoalkeeper) setControlledPlayer(possessor.id);
    clearSelection();
  }
  clearPass();
}
