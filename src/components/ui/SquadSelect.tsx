import { useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { NATION_ROSTERS, PLAYER_INFO, autoPickSquad } from "@/game/data/rosters";
import { teamRating } from "@/game/data/teamStrength";
import { FORMATION } from "@/game/data/formations";
import type { PlayerPosition } from "@/game/state/types";
import { Screen, Headline, BackButton } from "./Screen";
import { Flag } from "./Flag";
import { BoltIcon, CheckIcon, PlayIcon, StarIcon } from "./Icons";

const POS_COLOR: Record<PlayerPosition, string> = {
  GK: "#f59e0b",
  DEF: "#3b82f6",
  MID: "#10b981",
  FWD: "#ef4444",
};

/** Map a formation slot onto the pitch board, as CSS percentages. */
function slotStyle(fx: number, fz: number) {
  const top = ((0.2 - fz) / 1.2) * 84 + 8;
  const left = ((fx + 1) / 2) * 76 + 12;
  return { top: `${top}%`, left: `${left}%` };
}

/**
 * Layer 3: build the starting eight. Tap a slot to target it, then tap a player
 * to fill it (swapping if they were already picked). Ratings order the AUTO PICK
 * and give a very slight on-pitch edge — mostly they change the names on shirts.
 *
 * The board is height-capped rather than locked to an aspect ratio: at 3:4 on a
 * 448px column it was a fixed ~597px block that crushed the card list below it
 * on a laptop, leaving KICK OFF unreachable.
 */
export function SquadSelect() {
  const setScreen = useGameStore((s) => s.setScreen);
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const homeSquad = useGameStore((s) => s.homeSquad);
  const setHomeSquad = useGameStore((s) => s.setHomeSquad);
  const startMatch = useGameStore((s) => s.startMatch);

  const [activeSlot, setActiveSlot] = useState(0);

  const team = TEAMS[homeTeamId];
  const roster = NATION_ROSTERS[homeTeamId] ?? [];
  const slotOf = new Map(homeSquad.map((id, i) => [id, i]));

  const assign = (playerId: string) => {
    const next = [...homeSquad];
    const existing = slotOf.get(playerId);
    if (existing !== undefined) {
      // Already picked — swap the two slots.
      next[existing] = next[activeSlot];
    }
    next[activeSlot] = playerId;
    setHomeSquad(next);
    // Move focus to the next unfilled slot for quick tapping.
    const nextEmpty = next.findIndex((id, i) => i > activeSlot && !id);
    setActiveSlot(nextEmpty === -1 ? (activeSlot + 1) % FORMATION.length : nextEmpty);
  };

  const complete =
    homeSquad.length === FORMATION.length && homeSquad.every(Boolean);

  return (
    <Screen
      tint={team.kitColor}
      footer={
        <button
          disabled={!complete}
          onClick={startMatch}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-yellow-400 py-3.5 text-lg font-black text-emerald-950 shadow-[0_10px_30px_-8px_rgba(250,204,21,0.7)] transition hover:bg-yellow-300 active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          KICK OFF
          <PlayIcon className="h-5 w-5" />
        </button>
      }
    >
      <div className="flex items-center gap-3">
        <BackButton onClick={() => setScreen("teamSelect")} />
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-black tabular-nums ring-1 ring-white/10">
          <StarIcon className="h-3 w-3 text-yellow-300" />
          {teamRating(homeTeamId)}
        </div>
      </div>

      <div className="pp-rise mt-3 flex items-center justify-center gap-3">
        <Flag id={homeTeamId} width={34} />
        <Headline>{team.name}</Headline>
      </div>
      <p className="mt-1.5 text-center text-xs text-emerald-300/70">
        Tap a position, then tap a player to fill it.
      </p>

      {/* Formation board */}
      <div className="pp-rise mt-4">
        <div
          className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl ring-1 ring-white/15"
          style={{
            // Never taller than 44% of the viewport, so the cards below always
            // have room even on a short laptop screen.
            height: "min(58vw, 44vh, 420px)",
            background:
              "repeating-linear-gradient(0deg,#1e6b30 0 8%,#1a5f2a 8% 16%)",
          }}
        >
          <div className="pointer-events-none absolute inset-2 rounded-sm border-2 border-white/25" />
          <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t-2 border-white/25" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-[14%] w-1/2 -translate-x-1/2 border-2 border-b-0 border-white/25" />

          {FORMATION.map((slot, i) => {
            const id = homeSquad[i];
            const p = id ? PLAYER_INFO[id] : undefined;
            const active = i === activeSlot;
            return (
              <button
                key={i}
                onClick={() => setActiveSlot(i)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={slotStyle(slot.fx, slot.fz)}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black shadow-lg ring-2 transition ${
                    active
                      ? "scale-110 ring-yellow-300 shadow-[0_0_18px_-2px_rgba(250,204,21,0.9)]"
                      : "ring-white/50"
                  }`}
                  style={{
                    backgroundColor: p ? team.kitColor : "#00000060",
                    color: p ? "#101010" : "#ffffff90",
                  }}
                >
                  {p ? p.number : slot.role}
                </span>
                <span className="mt-0.5 max-w-[76px] truncate rounded bg-black/65 px-1 text-[9px] font-bold leading-tight">
                  {p ? p.name : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Player cards */}
      <div className="pp-rise mt-4 grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3">
        {roster.map((p) => {
          const inSquad = slotOf.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => assign(p.id)}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left ring-1 backdrop-blur-sm transition active:scale-95 ${
                inSquad
                  ? "bg-white/15 ring-yellow-300/70"
                  : "bg-white/[0.06] ring-white/10 hover:bg-white/[0.12]"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black"
                style={{ backgroundColor: POS_COLOR[p.position], color: "#0a0a0a" }}
              >
                {p.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold leading-tight">
                  {p.name}
                </span>
                <span className="block text-[10px] text-white/50">
                  {p.position} · {p.rating}
                </span>
              </span>
              {inSquad && <CheckIcon className="h-3.5 w-3.5 text-yellow-300" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setHomeSquad(autoPickSquad(homeTeamId))}
        className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-sky-500/90 px-5 py-2 text-xs font-black tracking-wide shadow-lg transition hover:bg-sky-400 active:scale-95"
      >
        <BoltIcon className="h-3.5 w-3.5" />
        AUTO PICK BEST
      </button>
    </Screen>
  );
}
