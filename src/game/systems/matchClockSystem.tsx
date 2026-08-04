import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi } from "./worldRegistry";
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

/**
 * Drives match flow from the render loop:
 * - ticks the countdown while the ball is in play (regulation or extra time);
 * - goal detection by ball position: only counts once the WHOLE ball has
 *   crossed the goal line between the posts, under the bar;
 * - real out-of-play: the moment the whole ball crosses a touchline or the
 *   goal line outside the goal, the ball returns to the centre spot and both
 *   teams reset to formation (a fresh kickoff);
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

      // Out of play: whole ball across a touchline, or across a goal line
      // outside the goal mouth. Restart from the centre spot with both teams
      // back in formation — a clean kickoff, just like after a goal.
      const overTouchline = Math.abs(t.x) > HALF_W + BALL_R;
      const overGoalLine = Math.abs(t.z) > LINE_Z + BALL_R && !withinGoalMouth;
      if (overTouchline || overGoalLine || t.y < -2) {
        state.kickoffReset();
        audio.whistle();
      }
    } else if (state.phase === "goalStoppage") {
      if (performance.now() / 1000 >= state.goalFlashUntil) {
        state.restartAfterGoal();
      }
    }
  });

  return null;
}
