import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import {
  ballApi,
  ballPosition,
  dribbleState,
  nearestPlayerToBall,
  playerRegistry,
} from "./worldRegistry";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";

const BALL_R = PHYSICS_CONFIG.ball.radius;
/** A player within this distance of the ball is in possession. */
const POSSESS_RADIUS = 1.35;
/** The carried ball sits this far ahead of the possessor's feet. */
const CARRY_DIST = 0.85;
/** Spring stiffness pulling the ball to the carry point. */
const CARRY_STIFFNESS = 12;
const MAX_CARRY_SPEED = 13;

const _carry = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _ball = new THREE.Vector3();
/** A newcomer must be this much closer than the current carrier to steal it. */
const STEAL_MARGIN = 0.5;

/**
 * The heart of the new control model:
 *  - Whichever player is on the ball "carries" it at their feet (close-control
 *    dribbling) instead of the ball pinging away on contact.
 *  - Control always follows the ball for the user's team: the moment a home
 *    outfield player gets on the ball, you take control of them — so a pass to
 *    a team-mate transfers control to whoever receives it.
 */
export function PossessionController() {
  useFrame(() => {
    const body = ballApi.body;
    const state = useGameStore.getState();
    if (!body || state.phase !== "live") {
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
      if (dPrev < POSSESS_RADIUS && dPrev - dNew < STEAL_MARGIN) possessor = prev;
    }
    dribbleState.possessorId = possessor ? possessor.id : null;

    // Control follows the ball for the human team (never the keeper).
    if (
      possessor &&
      possessor.team === "home" &&
      !possessor.isGoalkeeper &&
      possessor.id !== state.controlledPlayerId
    ) {
      state.setControlledPlayer(possessor.id);
    }

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
