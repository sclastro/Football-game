import type { TeamInfo } from "@/game/state/types";

/**
 * World-Cup style national teams. Colours drive kit tint + crowd/scoreboard.
 * Each nation's squad lives in `rosters.ts`, keyed by the same team id.
 *
 * There is deliberately no flag field: flags are DRAWN by `components/ui/Flag`
 * from the team id. Flag emoji are unusable because Windows ships no
 * regional-indicator glyphs, so they rendered as boxed letters.
 */
export const TEAMS: Record<string, TeamInfo> = {
  BRA: {
    id: "BRA",
    name: "Brazil",
    short: "BRA",
    kitColor: "#f7d417",
    accentColor: "#1f9e4a",
  },
  ARG: {
    id: "ARG",
    name: "Argentina",
    short: "ARG",
    kitColor: "#6cb7e6",
    accentColor: "#ffffff",
  },
  FRA: {
    id: "FRA",
    name: "France",
    short: "FRA",
    kitColor: "#1f3c8c",
    accentColor: "#ffffff",
  },
  ENG: {
    id: "ENG",
    name: "England",
    short: "ENG",
    kitColor: "#ececec",
    accentColor: "#cf1020",
  },
  GER: {
    id: "GER",
    name: "Germany",
    short: "GER",
    kitColor: "#efefef",
    accentColor: "#111111",
  },
  ESP: {
    id: "ESP",
    name: "Spain",
    short: "ESP",
    kitColor: "#c8102e",
    accentColor: "#ffd100",
  },
  POR: {
    id: "POR",
    name: "Portugal",
    short: "POR",
    kitColor: "#a01329",
    accentColor: "#0d5c34",
  },
  NED: {
    id: "NED",
    name: "Netherlands",
    short: "NED",
    kitColor: "#f36c21",
    accentColor: "#ffffff",
  },
  JPN: {
    id: "JPN",
    name: "Japan",
    short: "JPN",
    kitColor: "#12326b",
    accentColor: "#ffffff",
  },
  CRO: {
    id: "CRO",
    name: "Croatia",
    short: "CRO",
    kitColor: "#d7263d",
    accentColor: "#ffffff",
  },
  MEX: {
    id: "MEX",
    name: "Mexico",
    short: "MEX",
    kitColor: "#046a38",
    accentColor: "#ffffff",
  },
  MAR: {
    id: "MAR",
    name: "Morocco",
    short: "MAR",
    kitColor: "#b81b22",
    accentColor: "#0e6b3f",
  },
};

/** Ids of all selectable teams, in menu order. */
export const TEAM_IDS = Object.keys(TEAMS);

export const DEFAULT_HOME_TEAM = "BRA";
export const DEFAULT_AWAY_TEAM = "ARG";

// Per-nation squads live in `rosters.ts`.
