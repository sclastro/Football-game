import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi, clearPass, dribbleState } from "./worldRegistry";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import { GOAL_DIMENSIONS } from "@/game/entities/Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { isPlayingPhase } from "@/game/state/types";
import { audio } from "./audio";

const HALF_W = FIELD_DIMENSIONS.width / 2;
const LINE_Z = FIELD_DIMENSIONS.length / 2;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const GOAL_H = GOAL_DIMENSIONS.height;
const BALL_R = PHYSICS_CONFIG.ball.radius;
/** How close to a post a passing ball has to be to ring the woodwork. */
const POST_RING_DIST = 0.45;
/** A shot passing within this of the goal mouth draws an "oooh". */
const NEAR_MISS_X = 2.5;

/** Debounce so one ball rattling near a post doesn't machine-gun the sound. */
const woodwork = { lastAt: 0 };

/**
 * Play the crowd reaction for a ball flying at, or narrowly past, a goal.
 * Called only while the ball is near a goal line and travelling toward it.
 */
function reactToNearGoal(x: number, y: number, insideMouth: boolean): void {
  const now = performance.now() / 1000;
  if (now - woodwork.lastAt < 0.8) return;

  const distToPost = Math.abs(Math.abs(x) - HALF_GOAL_W);
  if (distToPost < POST_RING_DIST && y < GOAL_H + 0.4) {
    woodwork.lastAt = now;
    audio.post();
    return;
  }
  if (!insideMouth && Math.abs(x) < HALF_GOAL_W + NEAR_MISS_X && y < GOAL_H + 2) {
    woodwork.lastAt = now;
    audio.nearMiss();
  }
}

/** How far inside the line a ball that escaped anyway is put back. */
const RESCUE_INSET = 2;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Last-resort rescue for a ball that has somehow got outside the boards.
 *
 * There is no out of play in this game — the boards run along every line and
 * the ball rebounds — so this is not a throw-in, it is a safety net for a ball
 * that clipped a seam or fell through the world. Nobody is moved and nobody is
 * awarded anything; the ball is simply put back where it escaped.
 */
function rescueBall(outX: number, outZ: number): void {
  const body = ballApi.body;
  if (!body) return;

  const x = clamp(outX, -HALF_W + RESCUE_INSET, HALF_W - RESCUE_INSET);
  const z = clamp(outZ, -LINE_Z + RESCUE_INSET, LINE_Z - RESCUE_INSET);

  body.setTranslation({ x, y: BALL_R + 0.05, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  dribbleState.possessorId = null;
  clearPass();
}

/**
 * Drives match flow from the render loop:
 * - ticks the countdown while the ball is in play (regulation or extra time);
 * - goal detection by ball position: only counts once the WHOLE ball has
 *   crossed the goal line between the posts, under the bar;
 * - a safety net for a ball that escapes the boards entirely;
 * - resumes play after the GOAL! stoppage;
 * - runs the entrance countdown and the shootout timeline.
 */
export function MatchClock() {
  useFrame((_, delta) => {
    const state = useGameStore.getState();

    if (state.phase === "entrance") {
      // The kickoff whistle is played by the AudioController on entering
      // 'live', so it fires whether the entrance ran out or was skipped.
      if (performance.now() / 1000 >= state.entranceUntil) state.beginPlay();
      return;
    }

    if (state.phase === "shootout") {
      state.tickShootout();
      return;
    }

    if (isPlayingPhase(state.phase)) {
      state.tickClock(delta);

      const body = ballApi.body;
      if (!body) return;
      const t = body.translation();

      const withinGoalMouth = Math.abs(t.x) < HALF_GOAL_W && t.y < GOAL_H;

      // Crowd reaction as the ball arrives at either goal line.
      if (Math.abs(t.z) > LINE_Z - 1.2) {
        reactToNearGoal(t.x, t.y, withinGoalMouth);
      }

      // Home attacks -Z; a ball fully across the -Z line is a HOME goal.
      if (withinGoalMouth && t.z < -(LINE_Z + BALL_R)) {
        state.scoreGoal("home");
        return;
      }
      if (withinGoalMouth && t.z > LINE_Z + BALL_R) {
        state.scoreGoal("away");
        return;
      }

      // The boards keep the ball in, so this only ever fires for a ball that
      // has escaped the world (a seam, a fall through the floor). It is a
      // rescue, not a restart: no whistle, no award, play simply carries on.
      const escapedSide = Math.abs(t.x) > HALF_W + 2.5;
      const escapedEnd = Math.abs(t.z) > LINE_Z + 8;
      if (escapedSide || escapedEnd || t.y < -2) {
        rescueBall(t.x, t.z);
      }
    } else if (state.phase === "goalStoppage") {
      if (performance.now() / 1000 >= state.goalFlashUntil) {
        state.restartAfterGoal();
      }
    }
  });

  return null;
}
