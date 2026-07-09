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
/** How far inside the line the ball is placed for a quick restart. */
const RESTART_INSET = 1.2;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Drives match flow from the render loop:
 * - ticks the countdown while live;
 * - goal detection by ball position: only counts once the WHOLE ball has
 *   crossed the goal line between the posts, under the bar;
 * - real out-of-play: the moment the whole ball crosses a touchline or the
 *   goal line outside the goal, play restarts quickly from just inside the
 *   spot where it went out (simplified throw-in / goal kick);
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
      // outside the goal mouth. Quick restart just inside where it went out.
      const overTouchline = Math.abs(t.x) > HALF_W + BALL_R;
      const overGoalLine = Math.abs(t.z) > LINE_Z + BALL_R && !withinGoalMouth;
      if (overTouchline || overGoalLine || t.y < -2) {
        body.setTranslation(
          {
            x: clamp(t.x, -HALF_W + RESTART_INSET, HALF_W - RESTART_INSET),
            y: BALL_R + 0.05,
            z: clamp(t.z, -LINE_Z + RESTART_INSET, LINE_Z - RESTART_INSET),
          },
          true,
        );
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
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
