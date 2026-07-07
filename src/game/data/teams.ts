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

export interface RosterPlayer {
  id: string;
  name: string;
  number: number;
}

/**
 * Squads: 6 starters (index-aligned to FORMATION slots: GK, DEF, DEF, MID,
 * MID, FWD) plus 3 substitutes. Names are fictional, flavoured per nation.
 */
export const ROSTERS: Record<
  "home" | "away",
  { starters: RosterPlayer[]; bench: RosterPlayer[] }
> = {
  home: {
    starters: [
      { id: "home-p0", name: "Adão", number: 1 },
      { id: "home-p1", name: "Bruno", number: 3 },
      { id: "home-p2", name: "Caio", number: 4 },
      { id: "home-p3", name: "Davi", number: 8 },
      { id: "home-p4", name: "Enzo", number: 10 },
      { id: "home-p5", name: "Felipe", number: 9 },
    ],
    bench: [
      { id: "home-p6", name: "Gustavo", number: 7 },
      { id: "home-p7", name: "Heitor", number: 11 },
      { id: "home-p8", name: "Igor", number: 20 },
    ],
  },
  away: {
    starters: [
      { id: "away-p0", name: "Agustín", number: 1 },
      { id: "away-p1", name: "Bautista", number: 2 },
      { id: "away-p2", name: "Ciro", number: 6 },
      { id: "away-p3", name: "Dante", number: 5 },
      { id: "away-p4", name: "Emilio", number: 10 },
      { id: "away-p5", name: "Facundo", number: 9 },
    ],
    bench: [
      { id: "away-p6", name: "Gonzalo", number: 7 },
      { id: "away-p7", name: "Hernán", number: 11 },
      { id: "away-p8", name: "Iván", number: 18 },
    ],
  },
};

/** Flat lookup: player id -> roster info (name, number). */
export const PLAYER_INFO: Record<string, RosterPlayer> = Object.fromEntries(
  [
    ...ROSTERS.home.starters,
    ...ROSTERS.home.bench,
    ...ROSTERS.away.starters,
    ...ROSTERS.away.bench,
  ].map((p) => [p.id, p]),
);
