import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi, playerRegistry } from "@/game/systems/worldRegistry";
import { FIELD_DIMENSIONS } from "./Field";
import { GOAL_DIMENSIONS } from "./Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { PenaltyDirection, Side } from "@/game/state/types";

const HALF_L = FIELD_DIMENSIONS.length / 2;
const HALF_W = FIELD_DIMENSIONS.width / 2;
const SPOT_IN = FIELD_DIMENSIONS.penaltySpot;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const BALL_R = PHYSICS_CONFIG.ball.radius;

/** How long the store holds the 'resolving' stage, in seconds. */
const RESOLVE_TIME = 1.6;
/** Ball is in flight between these fractions of the resolve window. */
const FLIGHT_FROM = 0.12;
const FLIGHT_TO = 0.62;

/** Which way the ball goes for a direction, from the taker's point of view. */
function offsetFor(dir: PenaltyDirection | null, facing: number): number {
  if (dir === "left") return -HALF_GOAL_W * 0.68 * facing;
  if (dir === "right") return HALF_GOAL_W * 0.68 * facing;
  return 0;
}

/**
 * Scripted penalty presentation. During the shootout the match simulation is
 * idle, so this drives everything by hand: the ball sits on the spot, the taker
 * and keeper are placed, everyone else lines up on halfway, and the strike is
 * animated along a fixed arc.
 *
 * Nothing here uses physics — a dynamic ball fighting a scripted animation is
 * exactly the kind of thing that looks broken, so the ball is pinned each frame
 * and its velocity zeroed.
 */
export function PenaltyScene() {
  useFrame(() => {
    const st = useGameStore.getState();
    const so = st.shootout;
    const body = ballApi.body;
    if (!body || (st.phase !== "shootout" && st.phase !== "shootoutIntro")) return;

    const taker: Side = so ? so.turn : "home";
    // Home attacks -Z, away attacks +Z.
    const attackSign = taker === "home" ? -1 : 1;
    const goalZ = attackSign * HALF_L;
    const spotZ = goalZ - attackSign * SPOT_IN;
    // Screen-space "right" flips depending on which way the taker faces.
    const facing = taker === "home" ? 1 : -1;

    // --- Ball ---------------------------------------------------------------
    let ballX = 0;
    let ballY = BALL_R;
    let ballZ = spotZ;

    if (so && (so.stage === "resolving" || so.stage === "result")) {
      const remaining = so.nextAt - performance.now() / 1000;
      const elapsed =
        so.stage === "resolving"
          ? THREE.MathUtils.clamp(RESOLVE_TIME - remaining, 0, RESOLVE_TIME)
          : RESOLVE_TIME;
      const t = THREE.MathUtils.clamp(
        (elapsed / RESOLVE_TIME - FLIGHT_FROM) / (FLIGHT_TO - FLIGHT_FROM),
        0,
        1,
      );
      const targetX = offsetFor(so.shotDir, facing);
      const targetY = so.shotDir === "centre" ? 0.5 : 1.0;

      if (so.scored) {
        // Flies past the keeper and into the net.
        const endZ = goalZ - attackSign * -1.2; // just past the line
        ballX = THREE.MathUtils.lerp(0, targetX, t);
        ballZ = THREE.MathUtils.lerp(spotZ, endZ, t);
        ballY = BALL_R + Math.sin(t * Math.PI * 0.85) * targetY;
      } else {
        // Saved: reaches the keeper, then rebounds back out.
        const meet = Math.min(t, 0.72) / 0.72;
        const rebound = Math.max(0, t - 0.72) / 0.28;
        ballX = THREE.MathUtils.lerp(0, targetX, meet) * (1 - rebound * 0.45);
        ballZ =
          THREE.MathUtils.lerp(spotZ, goalZ, meet) +
          attackSign * -1 * rebound * 6;
        ballY = BALL_R + Math.sin(meet * Math.PI * 0.85) * targetY * (1 - rebound * 0.5);
      }
    }

    body.setTranslation({ x: ballX, y: ballY, z: ballZ }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // --- Players ------------------------------------------------------------
    const takerSquad = taker === "home" ? st.homeSquad : st.awaySquad;
    const keeperSide: Side = taker === "home" ? "away" : "home";
    // Rotate the taker through the squad so it isn't the same player every kick.
    const outfield = takerSquad.filter((pid) => {
      const rec = playerRegistry.get(pid);
      return rec && !rec.isGoalkeeper;
    });
    const takerId = outfield.length
      ? outfield[(so?.round ?? 0) % outfield.length]
      : null;

    let watcher = 0;
    for (const rec of playerRegistry.values()) {
      const rb = rec.rigidBody;
      if (!rb) continue;

      if (rec.isGoalkeeper && rec.team === keeperSide) {
        // The defending keeper on their line, diving once the kick is struck.
        let kx = 0;
        if (so && (so.stage === "resolving" || so.stage === "result")) {
          const remaining = so.nextAt - performance.now() / 1000;
          const elapsed =
            so.stage === "resolving"
              ? THREE.MathUtils.clamp(RESOLVE_TIME - remaining, 0, RESOLVE_TIME)
              : RESOLVE_TIME;
          const dt = THREE.MathUtils.clamp(
            (elapsed / RESOLVE_TIME - FLIGHT_FROM) / 0.4,
            0,
            1,
          );
          const ease = Math.sin(dt * Math.PI * 0.5);
          kx = offsetFor(so.diveDir, facing) * ease;
          rec.ai.diveUntil = performance.now() / 1000 + 0.2;
          rec.ai.diveSide = Math.sign(offsetFor(so.diveDir, facing)) || 0;
        }
        rb.setTranslation({ x: kx, y: 1, z: goalZ + attackSign * -0.4 }, true);
        rec.position.set(kx, 1, goalZ + attackSign * -0.4);
        continue;
      }

      if (rec.id === takerId) {
        // The taker, a couple of metres behind the ball.
        const z = spotZ - attackSign * -2.2;
        rb.setTranslation({ x: 0, y: 1, z }, true);
        rec.position.set(0, 1, z);
        continue;
      }

      // Everyone else waits on the halfway line, arms folded.
      const x = ((watcher % 8) - 3.5) * 2.4;
      const z = (rec.team === "home" ? 1 : -1) * 2.5;
      watcher++;
      rb.setTranslation({ x: THREE.MathUtils.clamp(x, -HALF_W + 2, HALF_W - 2), y: 1, z }, true);
      rec.position.set(x, 1, z);
    }
  });

  return null;
}
