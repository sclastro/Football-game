import { useEffect } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { nearestOutfieldToBall } from "./worldRegistry";

/**
 * Q switches control to the home outfield player nearest the ball
 * (never the goalkeeper — the GK is always AI, per design).
 */
export function ControlSwitcher() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyQ") return;
      const state = useGameStore.getState();
      if (state.phase !== "live") return;
      const nearest = nearestOutfieldToBall("home");
      if (nearest && nearest.id !== state.controlledPlayerId) {
        state.setControlledPlayer(nearest.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
