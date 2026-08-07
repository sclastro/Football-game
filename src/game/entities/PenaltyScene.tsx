import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore, PENALTY_RESOLVE_TIME } from "@/game/state/gameStore";
import { ballApi, playerRegistry } from "@/game/systems/worldRegistry";
import { targetPoint } from "@/game/systems/penaltySystem";
import { FIELD_DIMENSIONS } from "./Field";
import { GOAL_DIMENSIONS } from "./Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { Side } from "@/game/state/types";
import { DIVE_POSE_TIME } from "@/game/systems/kickAnimation";

const HALF_L = FIELD_DIMENSIONS.length / 2;
const HALF_W = FIELD_DIMENSIONS.width / 2;
const SPOT_IN = FIELD_DIMENSIONS.penaltySpot;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const BALL_R = PHYSICS_CONFIG.ball.radius;

/** Fractions of the resolve window. */
const RUNUP_END = 0.34; // taker walks in and plants
const STRIKE = 0.36; // contact
const FLIGHT_END = 0.72; // ball reaches the line
/** The keeper commits fractionally after contact — never before it. */
const DIVE_START = 0.37;
const DIVE_END = 0.64;

/**
 * Scripted penalty presentation. During the shootout the match simulation is
 * idle, so this drives everything by hand: the ball on the spot, a taker who
 * runs up and strikes, a keeper who launches at the right moment, and a ball
 * that follows whatever the outcome roll decided.
 *
 * Nothing here uses physics — a dynamic ball fighting a scripted animation is
 * exactly the kind of thing that looks broken — so the ball is pinned each
 * frame and its velocity zeroed.
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
    // Goal-mouth X is mirrored for the away end so "left" always means the
    // taker's left.
    const facing = taker === "home" ? 1 : -1;

    // How far through the kick we are, 0..1.
    let t = 0;
    if (so && so.stage === "resolving") {
      const remaining = so.nextAt - performance.now() / 1000;
      t = THREE.MathUtils.clamp(
        (PENALTY_RESOLVE_TIME - remaining) / PENALTY_RESOLVE_TIME,
        0,
        1,
      );
    } else if (so && so.stage === "result") {
      t = 1;
    }

    const kick = so?.kick ?? null;

    // --- Ball ---------------------------------------------------------------
    let bx = 0;
    let by = BALL_R;
    let bz = spotZ;

    if (kick && t > STRIKE) {
      const aim = targetPoint(kick.shotDir, kick.shotHeight);
      const targetX = aim.x * facing + kick.aimErrorX * facing;
      const targetY = aim.y + kick.aimErrorY;
      // 0..1 across the flight itself.
      const f = THREE.MathUtils.clamp(
        (t - STRIKE) / (FLIGHT_END - STRIKE),
        0,
        1,
      );

      if (kick.outcome === "saved") {
        // Reaches the keeper's hands, then drops and rebounds out.
        const meet = Math.min(f, 0.8) / 0.8;
        const after = Math.max(0, f - 0.8) / 0.2;
        bx = targetX * meet;
        bz = THREE.MathUtils.lerp(spotZ, goalZ + attackSign * 0.3, meet);
        by = BALL_R + targetY * meet;
        // Parried away from goal and down.
        bx += after * targetX * 0.5;
        bz -= attackSign * after * 5;
        by = Math.max(BALL_R, by - after * targetY * 0.8);
      } else if (kick.outcome === "post") {
        // Cannons off the upright and away.
        const postX = Math.sign(targetX || 1) * HALF_GOAL_W;
        const meet = Math.min(f, 0.7) / 0.7;
        const after = Math.max(0, f - 0.7) / 0.3;
        bx = postX * meet + after * postX * 0.4;
        bz =
          THREE.MathUtils.lerp(spotZ, goalZ, meet) - attackSign * after * 8;
        by = BALL_R + targetY * meet * (1 - after * 0.5);
      } else if (kick.outcome === "wide") {
        // Misses the frame entirely and carries on past the line.
        const endZ = goalZ - attackSign * -3;
        bx = THREE.MathUtils.lerp(0, targetX, f);
        bz = THREE.MathUtils.lerp(spotZ, endZ, f);
        by = BALL_R + targetY * f;
      } else {
        // Goal: past the keeper and into the net.
        const endZ = goalZ - attackSign * -1.4;
        bx = THREE.MathUtils.lerp(0, targetX, f);
        bz = THREE.MathUtils.lerp(spotZ, endZ, f);
        by = BALL_R + targetY * f;
      }
    }

    body.setTranslation({ x: bx, y: by, z: bz }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // --- Players ------------------------------------------------------------
    const takerSquad = taker === "home" ? st.homeSquad : st.awaySquad;
    const keeperSide: Side = taker === "home" ? "away" : "home";
    const outfield = takerSquad.filter((pid) => {
      const rec = playerRegistry.get(pid);
      return rec && !rec.isGoalkeeper;
    });
    // Rotate the taker through the squad so it isn't the same player every kick.
    const takerId = outfield.length
      ? outfield[(so?.round ?? 0) % outfield.length]
      : null;

    let watcher = 0;
    for (const rec of playerRegistry.values()) {
      const rb = rec.rigidBody;
      if (!rb) continue;

      // --- The defending keeper --------------------------------------------
      if (rec.isGoalkeeper && rec.team === keeperSide) {
        let kx = 0;
        let dive = 0;
        if (kick && t > DIVE_START) {
          const d = THREE.MathUtils.clamp(
            (t - DIVE_START) / (DIVE_END - DIVE_START),
            0,
            1,
          );
          // A late read starts the dive later and never fully extends — that's
          // what "guessed right but couldn't get there" has to look like.
          const commit = Math.sin(d * Math.PI * 0.5) * (0.55 + kick.diveTiming * 0.45);
          const aim = targetPoint(kick.diveDir, kick.shotHeight);
          kx = aim.x * facing * commit;
          dive = commit;
        }
        rb.setTranslation({ x: kx, y: 1, z: goalZ + attackSign * -0.4 }, true);
        rec.position.set(kx, 1, goalZ + attackSign * -0.4);

        // Feed the pose. PlayerEntity derives its 0→1 progress from how much of
        // DIVE_POSE_TIME is left, so the remaining time has to be written to
        // match the progress we want — writing a fixed offset every frame would
        // pin the pose at one instant and the dive would snap rather than play.
        rec.ai.diveSide = kick && kick.diveDir !== "centre" ? Math.sign(kx) || 0 : 0;
        rec.ai.diveUntil =
          dive > 0
            ? performance.now() / 1000 + DIVE_POSE_TIME * (1 - dive)
            : 0;
        rec.ai.diveHeight = kick
          ? kick.shotHeight === "low"
            ? 0
            : kick.shotHeight === "mid"
              ? 0.5
              : 1
          : 0.5;
        continue;
      }

      // --- The taker: run up, plant, strike ---------------------------------
      if (rec.id === takerId) {
        // Starts a few metres back and walks onto the ball.
        const startZ = spotZ - attackSign * -4.2;
        const plantZ = spotZ - attackSign * -1.1;
        const walk = THREE.MathUtils.clamp(t / RUNUP_END, 0, 1);
        const z = THREE.MathUtils.lerp(startZ, plantZ, walk);
        rb.setTranslation({ x: 0, y: 1, z }, true);
        rec.position.set(0, 1, z);
        continue;
      }

      // --- Everyone else waits on the halfway line --------------------------
      const x = ((watcher % 8) - 3.5) * 2.4;
      const z = (rec.team === "home" ? 1 : -1) * 2.5;
      watcher++;
      rb.setTranslation(
        { x: THREE.MathUtils.clamp(x, -HALF_W + 2, HALF_W - 2), y: 1, z },
        true,
      );
      rec.position.set(x, 1, z);
    }
  });

  return null;
}
