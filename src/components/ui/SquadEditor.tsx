import { useMemo, useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { PLAYER_INFO, type RosterPlayer } from "@/game/data/rosters";
import {
  formationById,
  recommendedFor,
  FORMATIONS,
  type FormationStyle,
} from "@/game/data/formations";
import { legendCount, sortedBench, squadRating } from "@/game/data/squad";
import { identityOf } from "@/game/data/tactics";
import { Screen, SectionTitle, Headline, BackButton } from "./Screen";
import { PlayerCard, PlayerDetail, shortName } from "./PlayerCard";
import { Flag } from "./Flag";
import { CheckIcon, StarIcon } from "./Icons";

const STYLE_LABEL: Record<FormationStyle, string> = {
  attack: "Attacking",
  counter: "Counter attack",
  defend: "Defensive",
};

const STYLE_TONE: Record<FormationStyle, string> = {
  attack: "text-rose-300",
  counter: "text-amber-300",
  defend: "text-sky-300",
};

/**
 * The squad editor.
 *
 * Three things happen on this one screen: pick a shape, pick the eleven, and
 * read up on anybody you are not sure about. You can only edit your OWN nation
 * — the side you are drawn against picks its own team, which is what the
 * scouting report is for.
 */
export function SquadEditor() {
  const setScreen = useGameStore((s) => s.setScreen);
  const scoutOpponent = useGameStore((s) => s.scoutOpponent);
  const teamId = useGameStore((s) => s.homeTeamId);
  const squad = useGameStore((s) => s.homeSquad);
  const bench = useGameStore((s) => s.homeBench);
  const formationId = useGameStore((s) => s.homeFormationId);
  const setFormation = useGameStore((s) => s.setFormation);
  const assignSlot = useGameStore((s) => s.assignSlot);
  const autoPick = useGameStore((s) => s.autoPick);

  const team = TEAMS[teamId];
  const formation = formationById(formationId);
  const recommended = useMemo(() => recommendedFor(teamId), [teamId]);
  const identity = identityOf(teamId);

  /** Which starting slot is waiting for a replacement, if any. */
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  /** Which player's detail panel is open. */
  const [detail, setDetail] = useState<RosterPlayer | null>(null);
  const [pool, setPool] = useState<"squad" | "legends">("squad");
  const [showAllShapes, setShowAllShapes] = useState(false);

  const benchList = useMemo(() => sortedBench(bench), [bench]);
  const visibleBench = benchList.filter((id) =>
    pool === "legends" ? PLAYER_INFO[id]?.legend : !PLAYER_INFO[id]?.legend,
  );

  const shapes = showAllShapes ? FORMATIONS : recommended;

  return (
    <Screen
      tint={team?.kitColor}
      footer={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold">{team?.name}</div>
            <div className="text-[10px] text-white/45">
              {formation.name} · rated {squadRating(squad)}
              {legendCount(squad) > 0 && ` · ${legendCount(squad)} legends`}
            </div>
          </div>
          <button
            onClick={autoPick}
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
          >
            Auto pick
          </button>
          <button
            onClick={scoutOpponent}
            className="rounded-full bg-yellow-400 px-6 py-2.5 text-sm font-black text-emerald-950 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.8)] transition hover:bg-yellow-300 active:scale-95"
          >
            Continue
          </button>
        </div>
      }
    >
      <BackButton onClick={() => setScreen("teamSelect")} />

      <div className="pp-rise mt-3 flex items-center justify-center gap-3">
        <Flag id={teamId} width={40} />
        <div>
          <Headline>{team?.name}</Headline>
          <p className="mt-1 text-center text-xs text-emerald-300/70">
            {identity.label} — {identity.summary}
          </p>
        </div>
      </div>

      {/* --- Formation ------------------------------------------------------ */}
      <div className="pp-rise mt-6">
        <SectionTitle>Formation</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {shapes.map((f) => {
            const active = f.id === formationId;
            return (
              <button
                key={f.id}
                onClick={() => setFormation(f.id)}
                className={`rounded-xl p-3 text-left ring-1 transition active:scale-95 ${
                  active
                    ? "bg-white/15 ring-yellow-300/80"
                    : "bg-white/[0.06] ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black tracking-tight">
                    {f.name}
                  </span>
                  {active && <CheckIcon className="h-4 w-4 text-yellow-300" />}
                </div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${STYLE_TONE[f.style]}`}
                >
                  {STYLE_LABEL[f.style]}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-white/50">
                  {f.summary}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAllShapes((v) => !v)}
          className="mx-auto mt-2 block text-[11px] font-semibold text-emerald-300/70 underline-offset-2 hover:underline"
        >
          {showAllShapes
            ? `Show only the three recommended for ${team?.short}`
            : "Show every formation"}
        </button>
      </div>

      {/* --- The pitch ------------------------------------------------------ */}
      <div className="pp-rise mt-6">
        <SectionTitle>Starting eleven</SectionTitle>
        <PitchView
          teamId={teamId}
          squad={squad}
          formationId={formationId}
          activeSlot={activeSlot}
          onSlot={(i) => setActiveSlot(activeSlot === i ? null : i)}
        />
        <p className="mt-2 text-center text-[11px] text-white/45">
          {activeSlot === null
            ? "Tap a position to change it."
            : "Now tap a replacement below, or tap the position again to cancel."}
        </p>
      </div>

      {/* --- The pool ------------------------------------------------------- */}
      <div className="pp-rise mt-6">
        <div className="mb-2.5 flex items-center justify-center gap-2">
          <PoolTab
            active={pool === "squad"}
            onClick={() => setPool("squad")}
            label="Squad"
          />
          <PoolTab
            active={pool === "legends"}
            onClick={() => setPool("legends")}
            label="Legends"
            icon
          />
        </div>

        {pool === "legends" && (
          <p className="mx-auto mb-3 max-w-md text-center text-[11px] leading-relaxed text-amber-200/60">
            The greats of {team?.name}. They pick exactly like anyone else — put
            them straight into the eleven if you want to.
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleBench.map((id) => {
            const p = PLAYER_INFO[id];
            if (!p) return null;
            return (
              <PlayerCard
                key={id}
                player={p}
                teamId={teamId}
                onClick={() => {
                  if (activeSlot !== null) {
                    assignSlot(activeSlot, id);
                    setActiveSlot(null);
                  } else {
                    setDetail(p);
                  }
                }}
              />
            );
          })}
          {!visibleBench.length && (
            <p className="col-span-full py-4 text-center text-xs text-white/40">
              Everyone from this pool is already in the eleven.
            </p>
          )}
        </div>
      </div>

      {detail && (
        <PlayerDetail
          player={detail}
          teamId={teamId}
          onClose={() => setDetail(null)}
        />
      )}
    </Screen>
  );
}

function PoolTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${
        active
          ? "bg-yellow-400 text-emerald-950"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
      }`}
    >
      {icon && <StarIcon className="h-3 w-3" />}
      {label}
    </button>
  );
}

/**
 * The eleven laid out on a pitch in their actual formation positions.
 *
 * Slots are placed from the same fractions the match uses, so what you see here
 * is literally where those players will stand at kickoff.
 */
function PitchView({
  teamId,
  squad,
  formationId,
  activeSlot,
  onSlot,
}: {
  teamId: string;
  squad: string[];
  formationId: string;
  activeSlot: number | null;
  onSlot: (i: number) => void;
}) {
  const formation = formationById(formationId);
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl ring-1 ring-white/15"
      style={{ height: "min(112vw, 62vh, 520px)" }}
    >
      {/* Turf */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, #ffffff10 0 22px, transparent 22px 44px)",
        }}
      />
      {/* Markings: halfway line, centre circle, penalty box at the bottom. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[14%] w-[52%] -translate-x-1/2 rounded-t-sm ring-1 ring-white/25" />

      {formation.slots.map((slot, i) => {
        const id = squad[i];
        const p = id ? PLAYER_INFO[id] : null;
        // fz -1 is the own goal line, which is the BOTTOM of this view.
        const top = ((1 - (slot.fz + 1) / 2) * 0.86 + 0.07) * 100;
        const left = ((slot.fx + 1) / 2) * 0.84 * 100 + 8;
        const active = activeSlot === i;
        return (
          <button
            key={i}
            onClick={() => onSlot(i)}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition active:scale-90"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black tabular-nums ring-2 transition ${
                active
                  ? "bg-yellow-400 text-emerald-950 ring-white"
                  : p?.legend
                    ? "bg-amber-500/90 text-amber-950 ring-amber-200/80"
                    : "bg-neutral-900/90 text-white ring-white/40"
              }`}
              style={
                !active && !p?.legend
                  ? { backgroundColor: TEAMS[teamId]?.kitColor, color: "#0a0a0a" }
                  : undefined
              }
            >
              {p?.number ?? "–"}
            </span>
            <span className="mt-0.5 block max-w-[74px] truncate text-center text-[9px] font-bold leading-tight text-white drop-shadow">
              {p ? shortName(p.name) : "Empty"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
