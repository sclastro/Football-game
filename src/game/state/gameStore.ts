import { create } from "zustand";
import type { MatchState } from "./types";
import { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM } from "@/game/data/teams";

/** Default match length in seconds (World-Cup-style, shortened for play). */
export const MATCH_DURATION = 6 * 60;
/** How long the "GOAL!" flash stays on screen, in seconds. */
export const GOAL_FLASH_DURATION = 2.5;

interface GameActions {
  /** Advance the match clock by dt seconds; ends the match at zero. */
  tickClock: (dt: number) => void;
  /** Register a goal for the given side and trigger the GOAL! flash. */
  scoreGoal: (side: "home" | "away") => void;
  /** After the goal stoppage: teleport everyone to kickoff spots and resume. */
  restartAfterGoal: () => void;
  /** Reset back to a fresh kickoff. */
  resetMatch: () => void;
  setControlledPlayer: (id: string) => void;
}

const initialState: MatchState = {
  homeTeamId: DEFAULT_HOME_TEAM,
  awayTeamId: DEFAULT_AWAY_TEAM,
  score: { home: 0, away: 0 },
  clock: MATCH_DURATION,
  phase: "live",
  controlledPlayerId: "home-5",
  goalFlashUntil: 0,
  resetNonce: 0,
};

export const useGameStore = create<MatchState & GameActions>((set) => ({
  ...initialState,

  tickClock: (dt) =>
    set((s) => {
      if (s.phase === "fulltime") return s;
      const clock = Math.max(0, s.clock - dt);
      return clock === 0 ? { clock, phase: "fulltime" } : { clock };
    }),

  scoreGoal: (side) =>
    set((s) => {
      if (s.phase !== "live") return s;
      return {
        score: { ...s.score, [side]: s.score[side] + 1 },
        goalFlashUntil: performance.now() / 1000 + GOAL_FLASH_DURATION,
        phase: "goalStoppage",
      };
    }),

  restartAfterGoal: () =>
    set((s) => ({ resetNonce: s.resetNonce + 1, phase: "live" })),

  resetMatch: () => set((s) => ({ ...initialState, resetNonce: s.resetNonce + 1 })),

  setControlledPlayer: (id) => set({ controlledPlayerId: id }),
}));
