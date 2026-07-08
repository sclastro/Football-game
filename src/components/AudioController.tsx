import { useEffect } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { audio } from "@/game/systems/audio";

/**
 * Bridges match events to the sound engine: kickoff whistle on mount, whistle +
 * crowd roar on a goal, and the long full-time whistle. Mounted only while a
 * match is on screen.
 */
export function AudioController() {
  useEffect(() => {
    audio.resume();
    audio.setEnabled(true);
    audio.whistle(); // kickoff

    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.phase === prev.phase) return;
      if (state.phase === "goalStoppage") {
        audio.whistle();
        audio.cheer();
      } else if (state.phase === "fulltime") {
        audio.whistle();
      }
    });
    return unsub;
  }, []);

  return null;
}
