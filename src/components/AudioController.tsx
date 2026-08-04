import { useEffect } from "react";
import { useGameStore, ENTRANCE_DURATION } from "@/game/state/gameStore";
import { audio } from "@/game/systems/audio";

/**
 * Bridges match events to the sound engine: a rising crowd swell during the
 * walk-out, whistles at each restart, a roar on a goal, and the tension and
 * release of the shootout. Mounted only while a match is on screen.
 */
export function AudioController() {
  useEffect(() => {
    audio.resume();
    audio.setEnabled(true);
    // The match opens on the entrance, so start with the walk-out swell.
    audio.swell(0.18, ENTRANCE_DURATION);

    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) {
        switch (state.phase) {
          case "goalStoppage":
            audio.whistle();
            audio.cheer();
            break;
          case "shootoutIntro":
            audio.whistle();
            audio.swell(0.2, 6);
            break;
          case "live": // kickoff, whether the entrance finished or was skipped
          case "extraTimeBreak":
          case "extraTime":
          case "fulltime":
            audio.whistle();
            break;
        }
      }

      // Shootout: react the moment a kick resolves.
      const stage = state.shootout?.stage;
      const prevStage = prev.shootout?.stage;
      if (stage === "result" && prevStage !== "result") {
        if (state.shootout?.scored) audio.cheer();
        else audio.groan();
      }
      if (stage === "choosing" && prevStage !== "choosing") {
        audio.swell(0.13, 3);
      }
    });
    return unsub;
  }, []);

  return null;
}
