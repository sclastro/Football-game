import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi } from "./worldRegistry";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import { GOAL_DIMENSIONS } from "@/game/entities/Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { audio } from "./audio";

const HALF_W = FIELD_DIMENSIONS.width / 2;
const LINE_Z = FIELD_DIMENSIONS.length / 2;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const GOAL_H = GOAL_DIMENSIONS.height;
const BALL_R = PHYSICS_CONFIG.ball.radius;

/**
 * Drives match flow from the render loop:
 * - ticks the countdown while live;
 * - goal detection by ball position: only counts once the WHOLE ball has
 *   crossed the goal line between the posts, under the bar;
 * - real out-of-play: the moment the whole ball crosses a touchline or the
 *   goal line outside the goal, the ball returns to the centre spot and both
 *   teams reset to formation (a fresh kickoff);
 * - resumes play after the GOAL! stoppage.
 */
export function MatchClock() {
  useFrame((_, delta) => {
    const state = useGameStore.getState();

    if (state.phase === "live") {
      state.tickClock(delta);

      const body = ballApi.body;
      if (!body) return;
      const t = body.translation();

      const withinGoalMouth = Math.abs(t.x) < HALF_GOAL_W && t.y < GOAL_H;
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
      const now = performance.now() / 1000;
      if (now >= state.goalFlashUntil) {
        state.restartAfterGoal();
      }
    }
  });

  return null;
}
