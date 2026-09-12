import type { Difficulty } from "@/game/data/difficulty";

export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export interface TeamInfo {
  id: string;
  name: string;
  /** 3-letter code shown on the scoreboard (e.g. "BRA"). */
  short: string;
  /** Primary kit colour (shirt tint, scoreboard bar, crowd tint). */
  kitColor: string;
  /** Secondary colour for trim/contrast. */
  accentColor: string;
}

/**
 * Match lifecycle:
 *   entrance → live → (goalStoppage → live)* → fulltime
 * or, when the score is level at the whistle:
 *   live → extraTimeBreak → extraTime → (shootoutIntro → shootout)? → fulltime
 */
export type MatchPhase =
  | "entrance"
  | "live"
  | "goalStoppage"
  | "extraTimeBreak"
  | "extraTime"
  | "shootoutIntro"
  | "shootout"
  | "fulltime";

/** Phases in which the ball is in play and the clock runs. */
export function isPlayingPhase(phase: MatchPhase): boolean {
  return phase === "live" || phase === "extraTime";
}

export type Screen =
  | "title"
  /** Pick your nation. */
  | "teamSelect"
  /** Squad editor: starting eleven, formation, player cards. */
  | "squad"
  /** Scouting report on the side you have been drawn against. */
  | "briefing"
  | "playing";

export type ControlMode = "keyboard" | "joystick";

/** Which of the three things on the front page you are doing. */
export type GameMode = "match" | "shootout" | "tutorial";

export type Side = "home" | "away";

/** What actually happened to a penalty. */
export type PenaltyOutcome = "goal" | "saved" | "post" | "wide";

/**
 * One penalty, in goal-mouth metres.
 *
 * The old left/centre/right model is gone: both the taker and the keeper now
 * choose a point, and whether the keeper's reach covers where the ball actually
 * ended up is the entire resolution.
 */
export interface PenaltyKick {
  /** Where the taker aimed. x is across the goal, y is height. */
  aimX: number;
  aimY: number;
  /** Where the ball actually went — aim plus the taker's nerve. */
  shotX: number;
  shotY: number;
  /** Centre of the keeper's reach. */
  diveX: number;
  diveY: number;
  /** Radius of that reach in metres, set by difficulty. */
  diveRadius: number;
  /** How close the keeper came: 0 = covered it, 1 = nowhere near. */
  missBy: number;
  outcome: PenaltyOutcome;
}

export interface ShootoutState {
  /** 0-based kick index within the current set (0-4 in regulation). */
  round: number;
  turn: Side;
  /** null = not taken yet, true = scored, false = saved/missed. */
  results: { home: (boolean | null)[]; away: (boolean | null)[] };
  suddenDeath: boolean;
  /** 'choosing' waits for the user, 'resolving' animates, 'result' shows it. */
  stage: "choosing" | "resolving" | "result";
  /** The kick being taken, once a point has been chosen. */
  kick: PenaltyKick | null;
  /** Wall-clock seconds (perf clock) at which the current stage advances. */
  nextAt: number;
}

export interface MatchState {
  /** Which top-level screen is showing. */
  screen: Screen;
  /** Which of the three front-page activities is running. */
  mode: GameMode;
  /** Input scheme (joystick is the on-screen touch control). */
  controlMode: ControlMode;
  /** AI strength, chosen in the menu. */
  difficulty: Difficulty;
  /** Chosen match length in seconds. */
  matchDuration: number;
  homeTeamId: string;
  awayTeamId: string;
  /** Shape each side lines up in, by formation id. */
  homeFormationId: string;
  awayFormationId: string;
  score: { home: number; away: number };
  /** Seconds remaining on the match clock. */
  clock: number;
  phase: MatchPhase;
  controlledPlayerId: string;
  /** Set briefly when a goal is scored so the HUD can show a GOAL! flash. */
  goalFlashUntil: number;
  /** Which side scored the most recent goal (drives the celebration). */
  lastScorer: Side | null;
  /** Incremented to signal every entity to teleport back to its kickoff spot. */
  resetNonce: number;
  /** Starting eleven for each side, index-aligned to the formation's slots. */
  homeSquad: string[];
  awaySquad: string[];
  /** Squad members not in the starting eleven (rendered on the bench). */
  homeBench: string[];
  awayBench: string[];
  /** Perf-clock seconds at which the entrance sequence ends. */
  entranceUntil: number;
  /** True once extra time has begun, so a goal stoppage resumes into it. */
  extraTimeActive: boolean;
  /** Non-null only during the shootout phases. */
  shootout: ShootoutState | null;
  /** Which tutorial lesson is showing, when the mode is 'tutorial'. */
  tutorialStep: number;
}
