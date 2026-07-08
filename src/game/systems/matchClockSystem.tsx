import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi } from "./worldRegistry";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import { GOAL_DIMENSIONS } from "@/game/entities/Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";

const LINE_Z = FIELD_DIMENSIONS.length / 2;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const GOAL_H = GOAL_DIMENSIONS.height;
const BALL_R = PHYSICS_CONFIG.ball.radius;
// Just outside the containing walls: any ball past here has escaped play.
const OUT_X = FIELD_DIMENSIONS.width / 2 + 1.6;
const OUT_Z = FIELD_DIMENSIONS.length / 2 + 3.6;

/**
 * Drives match flow from the render loop: ticks the countdown, detects goals by
 * ball position (a goal only counts once the WHOLE ball has crossed the line
 * between the posts and under the bar), resumes after the GOAL! stoppage, and
 * rescues a ball that escapes the pitch.
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

      // Rescue a ball that has left the field of play.
      if (Math.abs(t.x) > OUT_X || Math.abs(t.z) > OUT_Z || t.y < -2) {
        body.setTranslation({ x: 0, y: 0.4, z: 0 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
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
