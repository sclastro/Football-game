import type { TeamInfo } from "@/game/state/types";

/**
 * World-Cup style national teams. Colours drive kit tint + crowd/scoreboard.
 * Rosters are minimal for now (name/number/position); enough to render a
 * scoreboard and, later, fill an XI + bench.
 */
export const TEAMS: Record<string, TeamInfo> = {
  BRA: {
    id: "BRA",
    name: "Brazil",
    short: "BRA",
    kitColor: "#f7d417",
    accentColor: "#1f9e4a",
    flag: "🇧🇷",
  },
  ARG: {
    id: "ARG",
    name: "Argentina",
    short: "ARG",
    kitColor: "#6cb7e6",
    accentColor: "#ffffff",
    flag: "🇦🇷",
  },
  FRA: {
    id: "FRA",
    name: "France",
    short: "FRA",
    kitColor: "#1f3c8c",
    accentColor: "#ffffff",
    flag: "🇫🇷",
  },
  ENG: {
    id: "ENG",
    name: "England",
    short: "ENG",
    kitColor: "#ffffff",
    accentColor: "#cf1020",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
};

export const DEFAULT_HOME_TEAM = "BRA";
export const DEFAULT_AWAY_TEAM = "ARG";
