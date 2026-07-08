import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballApi } from "./worldRegistry";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";

const OUT_X = FIELD_DIMENSIONS.width / 2 + 3;
const OUT_Z = FIELD_DIMENSIONS.length / 2 + 6;

/**
 * Invisible scene component driving match flow from the render loop:
 * ticks the countdown while live, resumes play after the GOAL! stoppage,
 * and rescues the ball if it ever escapes the pitch (a simplified throw-in:
 * drop it back near the centre).
 */
export function MatchClock() {
  useFrame((_, delta) => {
    const state = useGameStore.getState();

    if (state.phase === "live") {
      state.tickClock(delta);

      const body = ballApi.body;
      if (body) {
        const t = body.translation();
        if (
          Math.abs(t.x) > OUT_X ||
          Math.abs(t.z) > OUT_Z ||
          t.y < -2 // fell through anything
        ) {
          body.setTranslation({ x: 0, y: 0.4, z: 0 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
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
