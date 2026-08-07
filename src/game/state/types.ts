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

export type Screen = "title" | "teamSelect" | "squadSelect" | "playing";
export type ControlMode = "keyboard" | "joystick";

export type Side = "home" | "away";

/** Where a penalty is aimed, or which way the keeper dives. */
export type PenaltyDirection = "left" | "centre" | "right";

/** How high the taker struck it. Height decides how reachable a save is. */
export type PenaltyHeight = "low" | "mid" | "high";

/** What actually happened to a penalty. */
export type PenaltyOutcome = "goal" | "saved" | "post" | "wide";

export interface PenaltyKick {
  /** Direction and height the taker went for. */
  shotDir: PenaltyDirection;
  shotHeight: PenaltyHeight;
  /** Direction the keeper committed to. */
  diveDir: PenaltyDirection;
  /** 0..1 — how well the keeper timed it. Low means they went late or early. */
  diveTiming: number;
  outcome: PenaltyOutcome;
  /** Sideways aim error in metres, so a wide shot misses by a believable amount. */
  aimErrorX: number;
  /** Vertical aim error in metres — positive is over the bar. */
  aimErrorY: number;
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
  /** The kick being taken, once a direction has been chosen. */
  kick: PenaltyKick | null;
  /** Wall-clock seconds (perf clock) at which the current stage advances. */
  nextAt: number;
}

export interface MatchState {
  /** Which top-level screen is showing. */
  screen: Screen;
  /** Input scheme (joystick is the on-screen touch control). */
  controlMode: ControlMode;
  /** AI strength, chosen in the menu. */
  difficulty: Difficulty;
  /** Chosen match length in seconds. */
  matchDuration: number;
  homeTeamId: string;
  awayTeamId: string;
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
  /** Starting eight for each side, index-aligned to FORMATION slots. */
  homeSquad: string[];
  awaySquad: string[];
  /** Squad members not in the starting eight (rendered on the bench). */
  homeBench: string[];
  awayBench: string[];
  /** Perf-clock seconds at which the entrance sequence ends. */
  entranceUntil: number;
  /** True once extra time has begun, so a goal stoppage resumes into it. */
  extraTimeActive: boolean;
  /** Non-null only during the shootout phases. */
  shootout: ShootoutState | null;
}
