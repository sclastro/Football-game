import { create } from "zustand";
import type { MatchState } from "./types";
import { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM, ROSTERS } from "@/game/data/teams";

/** Default match length in seconds (World-Cup-style, shortened for play). */
export const MATCH_DURATION = 6 * 60;
/** How long the "GOAL!" flash stays on screen, in seconds. */
export const GOAL_FLASH_DURATION = 2.5;
/** World Cup rules: at most 5 substitutions per match. */
export const MAX_SUBS = 5;

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
  /** Pause/resume for the substitution panel (only toggles between live and paused). */
  setPaused: (paused: boolean) => void;
  /**
   * Swap an on-field outfield player for a bench player. Enforces World Cup
   * rules: max 5 subs, and a player subbed off cannot come back on.
   */
  substitute: (outId: string, inId: string) => void;
}

const initialState: MatchState = {
  homeTeamId: DEFAULT_HOME_TEAM,
  awayTeamId: DEFAULT_AWAY_TEAM,
  score: { home: 0, away: 0 },
  clock: MATCH_DURATION,
  phase: "live",
  controlledPlayerId: ROSTERS.home.starters[5].id,
  goalFlashUntil: 0,
  resetNonce: 0,
  homeStarters: ROSTERS.home.starters.map((p) => p.id),
  homeBench: ROSTERS.home.bench.map((p) => p.id),
  homeSubbedOff: [],
  homeSubsUsed: 0,
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

  setPaused: (paused) =>
    set((s) => {
      if (paused && s.phase === "live") return { phase: "paused" };
      if (!paused && s.phase === "paused") return { phase: "live" };
      return s;
    }),

  substitute: (outId, inId) =>
    set((s) => {
      const slot = s.homeStarters.indexOf(outId);
      const benchIdx = s.homeBench.indexOf(inId);
      if (slot <= 0 || benchIdx === -1) return s; // slot 0 is the GK — never subbed
      if (s.homeSubsUsed >= MAX_SUBS) return s;
      if (s.homeSubbedOff.includes(inId)) return s;

      const starters = [...s.homeStarters];
      starters[slot] = inId;
      const bench = [...s.homeBench];
      bench[benchIdx] = outId;

      return {
        homeStarters: starters,
        homeBench: bench,
        homeSubbedOff: [...s.homeSubbedOff, outId],
        homeSubsUsed: s.homeSubsUsed + 1,
        controlledPlayerId:
          s.controlledPlayerId === outId ? inId : s.controlledPlayerId,
      };
    }),
}));
