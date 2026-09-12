import { create } from "zustand";
import type {
  ControlMode,
  GameMode,
  MatchState,
  ShootoutState,
  Side,
} from "./types";
import type { Difficulty } from "@/game/data/difficulty";
import {
  aiPenaltyAim,
  aiPenaltyDive,
  resolvePenalty,
} from "@/game/systems/penaltySystem";
import { DEFAULT_HOME_TEAM } from "@/game/data/teams";
import { autoPickSquad, benchFor, remapSquad } from "@/game/data/squad";
import {
  defaultFormationId,
  formationById,
} from "@/game/data/formations";
import { drawOpponent, opponentFormationId } from "@/game/data/tactics";
import { TUTORIAL_STEPS } from "@/game/data/tutorial";

/** Selectable match lengths, in seconds. */
export const DURATION_OPTIONS = [120, 180, 300] as const;
export const DEFAULT_DURATION = 180;
/** How long the "GOAL!" flash stays on screen, in seconds. */
export const GOAL_FLASH_DURATION = 2.5;
/** How long the walk-out sequence runs before kickoff, in seconds. */
export const ENTRANCE_DURATION = 7;
/** Kicks each side takes before sudden death. */
export const SHOOTOUT_KICKS = 5;
/** Seconds the run-up, strike and save animation plays for. */
export const PENALTY_RESOLVE_TIME = 2.4;

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
    kick: null,
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
  if (taken(s, "home") !== taken(s, "away")) return false;
  if (rounds < SHOOTOUT_KICKS) return false;
  return h !== a;
}

interface GameActions {
  setScreen: (screen: MatchState["screen"]) => void;
  setMode: (mode: GameMode) => void;
  setControlMode: (mode: ControlMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setMatchDuration: (seconds: number) => void;
  /** Pick your nation and move on to the squad editor. */
  chooseTeam: (teamId: string) => void;
  /** Change your shape, carrying the players you already picked across. */
  setFormation: (formationId: string) => void;
  /** Put a player into one slot of the starting eleven. */
  assignSlot: (slotIndex: number, playerId: string) => void;
  /** Reset the eleven to the best available. */
  autoPick: () => void;
  /** Draw an opponent and show the scouting report. */
  scoutOpponent: () => void;
  /** Kick off: run the entrance, then play. */
  startMatch: () => void;
  /** Jump straight into the standalone shootout. */
  startShootout: () => void;
  /** Enter the training ground. */
  startTutorial: () => void;
  setTutorialStep: (step: number) => void;
  /** Entrance finished (or was skipped) — start the match. */
  beginPlay: () => void;
  /** Advance the match clock by dt seconds, handling every end-of-period case. */
  tickClock: (dt: number) => void;
  scoreGoal: (side: Side) => void;
  /** After the goal stoppage: teleport everyone to kickoff spots and resume. */
  restartAfterGoal: () => void;
  setControlledPlayer: (id: string) => void;
  /** Extra-time card acknowledged — start the extra period. */
  beginExtraTime: () => void;
  /** Shootout intro acknowledged — start taking kicks. */
  beginShootout: () => void;
  /** The user committed their circle: shooting point, or keeper's reach. */
  penaltyAim: (x: number, y: number) => void;
  /** Drive the shootout's resolving → result → next-kick timeline. */
  tickShootout: () => void;
  /** Play the same fixture again from the entrance. */
  rematch: () => void;
  backToMenu: () => void;
}

const DEFAULT_FORMATION = defaultFormationId(DEFAULT_HOME_TEAM);
const DEFAULT_SQUAD = autoPickSquad(DEFAULT_HOME_TEAM, DEFAULT_FORMATION);

const initialState: MatchState = {
  screen: "title",
  mode: "match",
  controlMode: "joystick",
  difficulty: "normal",
  matchDuration: DEFAULT_DURATION,
  homeTeamId: DEFAULT_HOME_TEAM,
  awayTeamId: "ARG",
  homeFormationId: DEFAULT_FORMATION,
  awayFormationId: defaultFormationId("ARG"),
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
  tutorialStep: 0,
};

/** Draw the opposition and set up their shape, squad and bench. */
function drawFixture(homeTeamId: string, difficulty: Difficulty) {
  const awayTeamId = drawOpponent(homeTeamId, difficulty);
  const awayFormationId = opponentFormationId(awayTeamId, difficulty);
  const awaySquad = autoPickSquad(awayTeamId, awayFormationId);
  return {
    awayTeamId,
    awayFormationId,
    awaySquad,
    awayBench: benchFor(awayTeamId, awaySquad),
  };
}

export const useGameStore = create<MatchState & GameActions>((set) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setControlMode: (mode) => set({ controlMode: mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setMatchDuration: (matchDuration) => set({ matchDuration }),

  chooseTeam: (teamId) =>
    set(() => {
      const formationId = defaultFormationId(teamId);
      const squad = autoPickSquad(teamId, formationId);
      return {
        homeTeamId: teamId,
        homeFormationId: formationId,
        homeSquad: squad,
        homeBench: benchFor(teamId, squad),
        screen: "squad" as const,
      };
    }),

  setFormation: (formationId) =>
    set((s) => {
      if (formationId === s.homeFormationId) return s;
      const squad = remapSquad(s.homeSquad, formationById(formationId));
      return {
        homeFormationId: formationId,
        homeSquad: squad,
        homeBench: benchFor(s.homeTeamId, squad),
      };
    }),

  assignSlot: (slotIndex, playerId) =>
    set((s) => {
      const squad = [...s.homeSquad];
      if (slotIndex < 0 || slotIndex >= squad.length) return s;
      // If the incoming player is already on the pitch, the two swap places
      // rather than one of them vanishing.
      const existing = squad.indexOf(playerId);
      if (existing >= 0) {
        squad[existing] = squad[slotIndex];
      }
      squad[slotIndex] = playerId;
      return { homeSquad: squad, homeBench: benchFor(s.homeTeamId, squad) };
    }),

  autoPick: () =>
    set((s) => {
      const squad = autoPickSquad(s.homeTeamId, s.homeFormationId);
      return { homeSquad: squad, homeBench: benchFor(s.homeTeamId, squad) };
    }),

  scoutOpponent: () =>
    set((s) => ({
      ...drawFixture(s.homeTeamId, s.difficulty),
      screen: "briefing" as const,
    })),

  startMatch: () =>
    set((s) => ({
      screen: "playing" as const,
      mode: "match" as const,
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
    })),

  startShootout: () =>
    set((s) => ({
      ...drawFixture(s.homeTeamId, s.difficulty),
      screen: "playing" as const,
      mode: "shootout" as const,
      score: { home: 0, away: 0 },
      phase: "shootout" as const,
      shootout: freshShootout(),
      extraTimeActive: false,
      resetNonce: s.resetNonce + 1,
    })),

  startTutorial: () =>
    set((s) => ({
      ...drawFixture(s.homeTeamId, s.difficulty),
      screen: "playing" as const,
      mode: "tutorial" as const,
      phase: "live" as const,
      clock: 9999,
      score: { home: 0, away: 0 },
      tutorialStep: 0,
      shootout: null,
      extraTimeActive: false,
      controlledPlayerId: s.homeSquad[s.homeSquad.length - 1],
      resetNonce: s.resetNonce + 1,
    })),

  setTutorialStep: (step) =>
    set((s) => {
      const clamped = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, step));
      if (clamped === s.tutorialStep) return s;
      return { tutorialStep: clamped, resetNonce: s.resetNonce + 1 };
    }),

  beginPlay: () =>
    set((s) => ({
      phase: "live" as const,
      entranceUntil: 0,
      resetNonce: s.resetNonce + 1,
    })),

  tickClock: (dt) =>
    set((s) => {
      if (s.mode !== "match") return s;
      if (s.phase !== "live" && s.phase !== "extraTime") return s;
      const clock = Math.max(0, s.clock - dt);
      if (clock > 0) return { clock };

      const level = s.score.home === s.score.away;
      if (s.phase === "live") {
        return level
          ? { clock, phase: "extraTimeBreak" as const }
          : { clock, phase: "fulltime" as const };
      }
      return level
        ? { clock, phase: "shootoutIntro" as const }
        : { clock, phase: "fulltime" as const };
    }),

  scoreGoal: (side) =>
    set((s) => {
      if (s.phase !== "live" && s.phase !== "extraTime") return s;
      if (s.mode === "tutorial") {
        // The training ground keeps a tally but never stops play.
        return { score: { ...s.score, [side]: s.score[side] + 1 } };
      }
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

  penaltyAim: (x, y) =>
    set((s) => {
      const so = s.shootout;
      if (!so || so.stage !== "choosing") return s;
      // Home is always the user's side: they shoot on their turn and keep goal
      // on the opponent's turn. The other circle is placed by the AI, and the
      // ball's actual landing point is rolled from whichever aim was the shot.
      const userShooting = so.turn === "home";
      let kick;
      if (userShooting) {
        const dive = aiPenaltyDive(s.difficulty, { x, y });
        kick = resolvePenalty(x, y, dive.x, dive.y, s.difficulty, false);
      } else {
        const aim = aiPenaltyAim(s.difficulty);
        kick = resolvePenalty(aim.x, aim.y, x, y, s.difficulty, true);
      }
      return {
        shootout: {
          ...so,
          kick,
          stage: "resolving" as const,
          nextAt: now() + PENALTY_RESOLVE_TIME,
        },
      };
    }),

  tickShootout: () =>
    set((s) => {
      const so = s.shootout;
      if (!so || so.stage === "choosing" || now() < so.nextAt) return s;

      if (so.stage === "resolving") {
        const results = {
          home: [...so.results.home],
          away: [...so.results.away],
        };
        while (results[so.turn].length <= so.round) results[so.turn].push(null);
        results[so.turn][so.round] = so.kick?.outcome === "goal";
        return {
          shootout: {
            ...so,
            results,
            stage: "result" as const,
            nextAt: now() + 1.4,
          },
        };
      }

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
          kick: null,
          nextAt: 0,
        },
      };
    }),

  rematch: () =>
    set((s) => {
      if (s.mode === "shootout") {
        return {
          score: { home: 0, away: 0 },
          phase: "shootout" as const,
          shootout: freshShootout(),
          resetNonce: s.resetNonce + 1,
        };
      }
      return {
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
      };
    }),

  backToMenu: () =>
    set({ screen: "title", phase: "entrance", shootout: null }),
}));
