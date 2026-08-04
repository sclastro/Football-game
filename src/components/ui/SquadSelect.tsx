import { useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { NATION_ROSTERS, PLAYER_INFO, autoPickSquad } from "@/game/data/rosters";
import { FORMATION } from "@/game/data/formations";
import type { PlayerPosition } from "@/game/state/types";

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
 * to fill it (swapping if they were already picked). Ratings are cosmetic — they
 * order the AUTO PICK and nothing else.
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

  const complete = homeSquad.length === FORMATION.length && homeSquad.every(Boolean);

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-neutral-950 font-sans text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => setScreen("teamSelect")}
          className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold hover:bg-white/20"
        >
          ‹ Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{team.flag}</span>
          <span className="text-lg font-black tracking-wide">{team.name}</span>
        </div>
        <button
          onClick={() => setHomeSquad(autoPickSquad(homeTeamId))}
          className="ml-auto rounded-full bg-sky-500/90 px-4 py-1.5 text-xs font-black tracking-wide shadow hover:bg-sky-400"
        >
          ⚡ AUTO PICK
        </button>
      </div>

      {/* Formation board */}
      <div className="px-4 pt-3">
        <div
          className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl ring-1 ring-white/15"
          style={{
            aspectRatio: "3 / 4",
            background:
              "repeating-linear-gradient(0deg,#1e6b30 0 8%,#1a5f2a 8% 16%)",
          }}
        >
          {/* Pitch markings */}
          <div className="pointer-events-none absolute inset-2 rounded-sm border-2 border-white/25" />
          <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t-2 border-white/25" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-lg ring-2 transition ${
                    active ? "scale-110 ring-yellow-300" : "ring-white/50"
                  }`}
                  style={{
                    backgroundColor: p ? team.kitColor : "#00000060",
                    color: p ? "#101010" : "#ffffff90",
                  }}
                >
                  {p ? p.number : slot.role}
                </span>
                <span className="mt-0.5 max-w-[72px] truncate rounded bg-black/60 px-1 text-[9px] font-bold leading-tight">
                  {p ? p.name : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Player cards */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roster.map((p) => {
            const inSquad = slotOf.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => assign(p.id)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left ring-1 transition active:scale-95 ${
                  inSquad
                    ? "bg-white/15 ring-yellow-300/70"
                    : "bg-white/5 ring-white/10 hover:bg-white/10"
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
                {inSquad && <span className="text-[10px] text-yellow-300">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kick off */}
      <div className="border-t border-white/10 bg-black/30 px-4 py-3">
        <button
          disabled={!complete}
          onClick={startMatch}
          className="w-full rounded-full bg-yellow-400 py-3.5 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-yellow-300 active:scale-95 disabled:opacity-40"
        >
          KICK OFF ▶
        </button>
      </div>
    </div>
  );
}
