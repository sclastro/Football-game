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
  /** Emoji flag for the scoreboard. */
  flag: string;
}

export type MatchPhase =
  | "kickoff"
  | "live"
  | "paused"
  | "goalStoppage"
  | "fulltime";

export type Screen = "menu" | "playing";
export type ControlMode = "keyboard" | "joystick";

export interface MatchState {
  /** Which top-level screen is showing. */
  screen: Screen;
  /** Input scheme (joystick is the on-screen touch control). */
  controlMode: ControlMode;
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
  lastScorer: "home" | "away" | null;
  /** Incremented to signal every entity to teleport back to its kickoff spot. */
  resetNonce: number;
  /** Player ids currently on the pitch for the user's team, slot-aligned to FORMATION. */
  homeStarters: string[];
  /** Player ids currently available on the user's bench. */
  homeBench: string[];
  /** Ids subbed off this match — World Cup rules, they cannot return. */
  homeSubbedOff: string[];
  /** Substitutions made so far (max 5, World Cup rules). */
  homeSubsUsed: number;
}
