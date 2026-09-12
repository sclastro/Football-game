import type { RosterPlayer } from "@/game/data/rosters";
import { TEAMS } from "@/game/data/teams";
import { Flag } from "./Flag";
import { StarIcon } from "./Icons";

/** Position colours, so a back line reads at a glance in the squad list. */
const POSITION_TONE: Record<string, string> = {
  GK: "bg-amber-400 text-amber-950",
  DEF: "bg-sky-400 text-sky-950",
  MID: "bg-emerald-400 text-emerald-950",
  FWD: "bg-rose-400 text-rose-950",
};

/** Surname only, which is what fits on a card at this size. */
export function shortName(name: string): string {
  const parts = name.split(" ");
  return parts.length > 1 && parts[0].endsWith(".")
    ? parts.slice(1).join(" ")
    : name;
}

interface PlayerCardProps {
  player: RosterPlayer;
  teamId: string;
  /** Compact cards are used inside the pitch view; full ones in the list. */
  size?: "sm" | "md";
  selected?: boolean;
  onClick?: () => void;
}

/**
 * A player card: rating, position, number, name and nation, with the kit colour
 * running down the spine.
 *
 * Legends get a gold treatment. That is the only visual difference between the
 * two pools, and it is deliberately loud — knowing at a glance that you have
 * three retired greats in your eleven is the point of being able to pick them.
 */
export function PlayerCard({
  player,
  teamId,
  size = "md",
  selected = false,
  onClick,
}: PlayerCardProps) {
  const team = TEAMS[teamId];
  const compact = size === "sm";
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl text-left ring-1 transition active:scale-95 ${
        player.legend
          ? "bg-gradient-to-br from-amber-500/25 via-amber-300/10 to-transparent ring-amber-300/60"
          : "bg-white/[0.07] ring-white/10 hover:bg-white/[0.13] hover:ring-white/25"
      } ${selected ? "ring-2 ring-yellow-300 shadow-[0_8px_28px_-10px_rgba(250,204,21,0.9)]" : ""}`}
    >
      {/* Kit-colour spine */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: team?.kitColor ?? "#888" }}
      />
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ backgroundColor: team?.kitColor ?? "#888" }}
      />

      <span
        className={`relative flex items-center gap-2 ${compact ? "px-2 py-1.5" : "px-3 py-2.5"}`}
      >
        <span
          className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-black/45 ${
            compact ? "h-8 w-8" : "h-11 w-11"
          }`}
        >
          <span
            className={`font-black leading-none tabular-nums ${compact ? "text-sm" : "text-lg"}`}
          >
            {player.rating}
          </span>
          {!compact && (
            <span className="mt-0.5 text-[9px] font-bold tracking-wider text-white/50">
              OVR
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`rounded px-1 py-px text-[9px] font-black ${POSITION_TONE[player.position] ?? "bg-white/20"}`}
            >
              {player.position}
            </span>
            <span className="text-[10px] font-bold tabular-nums text-white/45">
              #{player.number}
            </span>
            {player.legend && (
              <StarIcon className="h-2.5 w-2.5 text-amber-300" />
            )}
          </span>
          <span
            className={`block truncate font-black leading-tight ${compact ? "text-xs" : "text-sm"}`}
          >
            {compact ? shortName(player.name) : player.name}
          </span>
          {!compact && (
            <span className="block truncate text-[10px] leading-tight text-white/45">
              {player.trait}
            </span>
          )}
        </span>

        {!compact && <Flag id={teamId} width={22} />}
      </span>
    </button>
  );
}

/** The expanded panel shown when a card is opened. */
export function PlayerDetail({
  player,
  teamId,
  onClose,
}: {
  player: RosterPlayer;
  teamId: string;
  onClose: () => void;
}) {
  const team = TEAMS[teamId];
  const rows: [string, number][] = [
    ["Pace", player.attributes.pace],
    ["Shooting", player.attributes.shooting],
    ["Passing", player.attributes.passing],
    ["Defending", player.attributes.defending],
    ["Physical", player.attributes.physical],
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="pp-rise w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative p-4"
          style={{
            background: `linear-gradient(135deg, ${team?.kitColor ?? "#333"}55, transparent 70%)`,
          }}
        >
          {player.legend && (
            <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-200 ring-1 ring-amber-300/50">
              <StarIcon className="h-2.5 w-2.5" />
              Legend
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-black/50">
              <span className="text-2xl font-black leading-none tabular-nums">
                {player.rating}
              </span>
              <span className="text-[9px] font-bold tracking-wider text-white/50">
                {player.position}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-black leading-tight">
                {player.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/55">
                <Flag id={teamId} width={18} />
                <span>{team?.name}</span>
                <span className="tabular-nums">#{player.number}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <p className="text-[13px] leading-relaxed text-white/75">{player.bio}</p>
          <div className="mt-3 space-y-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-20 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {label}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-yellow-300"
                    style={{ width: `${value}%` }}
                  />
                </span>
                <span className="w-6 text-right text-[11px] font-black tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-white/10 py-2 text-sm font-bold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
