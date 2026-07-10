import { create } from "zustand";
import type { ControlMode, MatchState } from "./types";
import {
  DEFAULT_AWAY_TEAM,
  DEFAULT_HOME_TEAM,
  ROSTERS,
  TEAM_IDS,
} from "@/game/data/teams";

/** Selectable match lengths, in seconds. */
export const DURATION_OPTIONS = [120, 180, 300] as const;
export const DEFAULT_DURATION = 180;
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
  /** Ball went out of play: reset ball to centre + everyone to kickoff spots. */
  kickoffReset: () => void;
  setControlledPlayer: (id: string) => void;
  setControlMode: (mode: ControlMode) => void;
  /** Start a match: pick a random opponent, set length, go to the pitch. */
  startMatch: (homeTeamId: string, durationSeconds: number) => void;
  /** Return to the main menu. */
  backToMenu: () => void;
}

function freshRoster() {
  return {
    controlledPlayerId: ROSTERS.home.starters[5].id,
    homeStarters: ROSTERS.home.starters.map((p) => p.id),
    homeBench: ROSTERS.home.bench.map((p) => p.id),
    homeSubbedOff: [] as string[],
    homeSubsUsed: 0,
  };
}

const initialState: MatchState = {
  screen: "menu",
  controlMode: "keyboard",
  matchDuration: DEFAULT_DURATION,
  homeTeamId: DEFAULT_HOME_TEAM,
  awayTeamId: DEFAULT_AWAY_TEAM,
  score: { home: 0, away: 0 },
  clock: DEFAULT_DURATION,
  phase: "live",
  goalFlashUntil: 0,
  lastScorer: null,
  resetNonce: 0,
  ...freshRoster(),
};

function randomOpponent(homeTeamId: string): string {
  const others = TEAM_IDS.filter((id) => id !== homeTeamId);
  return others[Math.floor(Math.random() * others.length)];
}

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
        lastScorer: side,
      };
    }),

  restartAfterGoal: () =>
    set((s) => ({ resetNonce: s.resetNonce + 1, phase: "live" })),

  kickoffReset: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),

  setControlledPlayer: (id) => set({ controlledPlayerId: id }),

  setControlMode: (mode) => set({ controlMode: mode }),

  startMatch: (homeTeamId, durationSeconds) =>
    set((s) => ({
      screen: "playing",
      homeTeamId,
      awayTeamId: randomOpponent(homeTeamId),
      matchDuration: durationSeconds,
      clock: durationSeconds,
      score: { home: 0, away: 0 },
      phase: "live",
      goalFlashUntil: 0,
      lastScorer: null,
      resetNonce: s.resetNonce + 1,
      ...freshRoster(),
    })),

  backToMenu: () => set({ screen: "menu", phase: "live" }),
}));
