import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";

/**
 * Invisible scene component driving match flow from the render loop:
 * ticks the countdown while live, and once the GOAL! stoppage expires,
 * signals every entity to teleport to kickoff spots and resumes play.
 */
export function MatchClock() {
  useFrame((_, delta) => {
    const state = useGameStore.getState();

    if (state.phase === "live") {
      state.tickClock(delta);
    } else if (state.phase === "goalStoppage") {
      const now = performance.now() / 1000;
      if (now >= state.goalFlashUntil) {
        state.restartAfterGoal();
      }
    }
  });

  return null;
}
