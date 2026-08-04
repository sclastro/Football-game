import { create } from "zustand";
import type {
  ControlMode,
  MatchState,
  PenaltyDirection,
  ShootoutState,
  Side,
} from "./types";
import type { Difficulty } from "@/game/data/difficulty";
import { DEFAULT_HOME_TEAM, TEAM_IDS } from "@/game/data/teams";
import { autoPickSquad, benchFor } from "@/game/data/rosters";

/** Selectable match lengths, in seconds. */
export const DURATION_OPTIONS = [120, 180, 300] as const;
export const DEFAULT_DURATION = 180;
/** How long the "GOAL!" flash stays on screen, in seconds. */
export const GOAL_FLASH_DURATION = 2.5;
/** How long the walk-out sequence runs before kickoff, in seconds. */
export const ENTRANCE_DURATION = 7;
/** Kicks each side takes before sudden death. */
export const SHOOTOUT_KICKS = 5;

/** Extra time added when the score is level, keyed by regulation length. */
const EXTRA_TIME: Record<number, number> = {
  120: 60,
  180: 90,
  300: 120,
};

function extraTimeFor(duration: number): number {
  return EXTRA_TIME[duration] ?? Math.round(duration / 2);
}

const now = () => performance.now() / 1000;

function randomOpponent(homeTeamId: string): string {
  const others = TEAM_IDS.filter((id) => id !== homeTeamId);
  return others[Math.floor(Math.random() * others.length)];
}

function freshShootout(): ShootoutState {
  return {
    round: 0,
    turn: "home",
    results: {
      home: Array<boolean | null>(SHOOTOUT_KICKS).fill(null),
      away: Array<boolean | null>(SHOOTOUT_KICKS).fill(null),
    },
    suddenDeath: false,
    stage: "choosing",
    shotDir: null,
    diveDir: null,
    scored: null,
    nextAt: 0,
  };
}

/** How many kicks each side has actually taken. */
function taken(s: ShootoutState, side: Side): number {
  return s.results[side].filter((r) => r !== null).length;
}

/** Goals scored so far by a side in the shootout. */
export function shootoutGoals(s: ShootoutState, side: Side): number {
  return s.results[side].filter((r) => r === true).length;
}

/** True once the shootout has a winner and cannot change. */
function shootoutDecided(s: ShootoutState): boolean {
  const h = shootoutGoals(s, "home");
  const a = shootoutGoals(s, "away");
  const rounds = Math.min(taken(s, "home"), taken(s, "away"));
  // Both sides have completed the same number of kicks and are level or not.
  if (taken(s, "home") !== taken(s, "away")) return false;
  if (rounds < SHOOTOUT_KICKS) return false;
  return h !== a;
}

interface GameActions {
  setScreen: (screen: MatchState["screen"]) => void;
  setControlMode: (mode: ControlMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setMatchDuration: (seconds: number) => void;
  /** Pick your nation and move on to squad selection. */
  chooseTeam: (teamId: string) => void;
  /** Replace the starting eight (slot-aligned to FORMATION). */
  setHomeSquad: (squad: string[]) => void;
  /** Kick off: draw an opponent, run the entrance, then play. */
  startMatch: () => void;
  /** Entrance finished (or was skipped) — start the match. */
  beginPlay: () => void;
  /** Advance the match clock by dt seconds, handling every end-of-period case. */
  tickClock: (dt: number) => void;
  scoreGoal: (side: Side) => void;
  /** After the goal stoppage: teleport everyone to kickoff spots and resume. */
  restartAfterGoal: () => void;
  /** Ball went out of play: reset ball to centre + everyone to kickoff spots. */
  kickoffReset: () => void;
  setControlledPlayer: (id: string) => void;
  /** Extra-time card acknowledged — start the extra period. */
  beginExtraTime: () => void;
  /** Shootout intro acknowledged — start taking kicks. */
  beginShootout: () => void;
  /** The user picked a direction (to shoot, or to dive). */
  penaltyChoice: (dir: PenaltyDirection) => void;
  /** Drive the shootout's resolving → result → next-kick timeline. */
  tickShootout: () => void;
  /** Play the same fixture again from the entrance. */
  rematch: () => void;
  backToMenu: () => void;
}

const DEFAULT_SQUAD = autoPickSquad(DEFAULT_HOME_TEAM);

const initialState: MatchState = {
  screen: "title",
  controlMode: "joystick",
  difficulty: "normal",
  matchDuration: DEFAULT_DURATION,
  homeTeamId: DEFAULT_HOME_TEAM,
  awayTeamId: randomOpponent(DEFAULT_HOME_TEAM),
  score: { home: 0, away: 0 },
  clock: DEFAULT_DURATION,
  phase: "entrance",
  controlledPlayerId: DEFAULT_SQUAD[DEFAULT_SQUAD.length - 1],
  goalFlashUntil: 0,
  lastScorer: null,
  resetNonce: 0,
  homeSquad: DEFAULT_SQUAD,
  awaySquad: [],
  homeBench: benchFor(DEFAULT_HOME_TEAM, DEFAULT_SQUAD),
  awayBench: [],
  entranceUntil: 0,
  extraTimeActive: false,
  shootout: null,
};

export const useGameStore = create<MatchState & GameActions>((set) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),
  setControlMode: (mode) => set({ controlMode: mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setMatchDuration: (matchDuration) => set({ matchDuration }),

  chooseTeam: (teamId) =>
    set(() => {
      const squad = autoPickSquad(teamId);
      return {
        homeTeamId: teamId,
        homeSquad: squad,
        homeBench: benchFor(teamId, squad),
        screen: "squadSelect" as const,
      };
    }),

  setHomeSquad: (squad) =>
    set((s) => ({ homeSquad: squad, homeBench: benchFor(s.homeTeamId, squad) })),

  startMatch: () =>
    set((s) => {
      const awayTeamId = randomOpponent(s.homeTeamId);
      const awaySquad = autoPickSquad(awayTeamId);
      return {
        screen: "playing" as const,
        awayTeamId,
        awaySquad,
        awayBench: benchFor(awayTeamId, awaySquad),
        score: { home: 0, away: 0 },
        clock: s.matchDuration,
        phase: "entrance" as const,
        entranceUntil: now() + ENTRANCE_DURATION,
        goalFlashUntil: 0,
        lastScorer: null,
        extraTimeActive: false,
        shootout: null,
        // Start on the most advanced outfielder.
        controlledPlayerId: s.homeSquad[s.homeSquad.length - 1],
        resetNonce: s.resetNonce + 1,
      };
    }),

  beginPlay: () =>
    set((s) => ({
      phase: "live" as const,
      entranceUntil: 0,
      resetNonce: s.resetNonce + 1,
    })),

  tickClock: (dt) =>
    set((s) => {
      if (s.phase !== "live" && s.phase !== "extraTime") return s;
      const clock = Math.max(0, s.clock - dt);
      if (clock > 0) return { clock };

      const level = s.score.home === s.score.away;
      if (s.phase === "live") {
        // End of regulation: level goes to extra time, otherwise full time.
        return level
          ? { clock, phase: "extraTimeBreak" as const }
          : { clock, phase: "fulltime" as const };
      }
      // End of extra time: level goes to penalties.
      return level
        ? { clock, phase: "shootoutIntro" as const }
        : { clock, phase: "fulltime" as const };
    }),

  scoreGoal: (side) =>
    set((s) => {
      if (s.phase !== "live" && s.phase !== "extraTime") return s;
      return {
        score: { ...s.score, [side]: s.score[side] + 1 },
        goalFlashUntil: now() + GOAL_FLASH_DURATION,
        phase: "goalStoppage" as const,
        lastScorer: side,
      };
    }),

  restartAfterGoal: () =>
    set((s) => ({
      resetNonce: s.resetNonce + 1,
      phase: s.extraTimeActive ? ("extraTime" as const) : ("live" as const),
    })),

  kickoffReset: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),

  setControlledPlayer: (id) => set({ controlledPlayerId: id }),

  beginExtraTime: () =>
    set((s) => ({
      phase: "extraTime" as const,
      extraTimeActive: true,
      clock: extraTimeFor(s.matchDuration),
      resetNonce: s.resetNonce + 1,
    })),

  beginShootout: () =>
    set({ phase: "shootout" as const, shootout: freshShootout() }),

  penaltyChoice: (dir) =>
    set((s) => {
      const so = s.shootout;
      if (!so || so.stage !== "choosing") return s;
      const other: PenaltyDirection[] = ["left", "centre", "right"];
      const random = other[Math.floor(Math.random() * other.length)];
      // Home is always the user's side: they shoot on their turn and keep goal
      // on the opponent's turn.
      const shotDir = so.turn === "home" ? dir : random;
      const diveDir = so.turn === "home" ? random : dir;
      return {
        shootout: {
          ...so,
          shotDir,
          diveDir,
          scored: shotDir !== diveDir,
          stage: "resolving" as const,
          nextAt: now() + 1.6,
        },
      };
    }),

  tickShootout: () =>
    set((s) => {
      const so = s.shootout;
      if (!so || so.stage === "choosing" || now() < so.nextAt) return s;

      if (so.stage === "resolving") {
        // Commit the result and hold on it briefly.
        const results = {
          home: [...so.results.home],
          away: [...so.results.away],
        };
        while (results[so.turn].length <= so.round) results[so.turn].push(null);
        results[so.turn][so.round] = so.scored;
        return {
          shootout: {
            ...so,
            results,
            stage: "result" as const,
            nextAt: now() + 1.2,
          },
        };
      }

      // stage === 'result': either the shootout is decided, or take the next kick.
      if (shootoutDecided(so)) {
        return { phase: "fulltime" as const };
      }
      const nextTurn: Side = so.turn === "home" ? "away" : "home";
      const nextRound = nextTurn === "home" ? so.round + 1 : so.round;
      const suddenDeath = so.suddenDeath || nextRound >= SHOOTOUT_KICKS;
      const results = {
        home: [...so.results.home],
        away: [...so.results.away],
      };
      // Sudden death appends rounds beyond the initial five.
      while (results.home.length <= nextRound) results.home.push(null);
      while (results.away.length <= nextRound) results.away.push(null);
      return {
        shootout: {
          ...so,
          results,
          turn: nextTurn,
          round: nextRound,
          suddenDeath,
          stage: "choosing" as const,
          shotDir: null,
          diveDir: null,
          scored: null,
          nextAt: 0,
        },
      };
    }),

  rematch: () =>
    set((s) => ({
      score: { home: 0, away: 0 },
      clock: s.matchDuration,
      phase: "entrance" as const,
      entranceUntil: now() + ENTRANCE_DURATION,
      goalFlashUntil: 0,
      lastScorer: null,
      extraTimeActive: false,
      shootout: null,
      controlledPlayerId: s.homeSquad[s.homeSquad.length - 1],
      resetNonce: s.resetNonce + 1,
    })),

  backToMenu: () =>
    set({ screen: "title", phase: "entrance", shootout: null }),
}));
