import { create } from "zustand";
import type { MatchState } from "./types";

export const useGameStore = create<MatchState>(() => ({
  controlledPlayerId: "player-1",
}));
