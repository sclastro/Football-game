import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";

/**
 * Invisible scene component that ticks the match clock via the render loop,
 * so the countdown stays in sync with physics and pauses cleanly when the
 * match is not live.
 */
export function MatchClock() {
  const tickClock = useGameStore((s) => s.tickClock);

  useFrame((_, delta) => {
    if (useGameStore.getState().phase === "live") {
      tickClock(delta);
    }
  });

  return null;
}
