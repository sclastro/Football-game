import { useEffect, useState } from "react";
import { useGameStore, MAX_SUBS } from "@/game/state/gameStore";
import { PLAYER_INFO } from "@/game/data/teams";

/**
 * Substitution panel. P (or the button) pauses the match and opens it;
 * pick who comes off and who comes on, confirm, and play resumes.
 * Slot 0 (the goalkeeper) is never listed — the GK can't be subbed.
 */
export function SubPanel() {
  const [open, setOpen] = useState(false);
  const [outId, setOutId] = useState<string | null>(null);
  const [inId, setInId] = useState<string | null>(null);

  const phase = useGameStore((s) => s.phase);
  const starters = useGameStore((s) => s.homeStarters);
  const bench = useGameStore((s) => s.homeBench);
  const subbedOff = useGameStore((s) => s.homeSubbedOff);
  const subsUsed = useGameStore((s) => s.homeSubsUsed);
  const setPaused = useGameStore((s) => s.setPaused);
  const substitute = useGameStore((s) => s.substitute);

  const toggle = (next: boolean) => {
    // Only allow opening while live (not during goal stoppage / fulltime).
    const state = useGameStore.getState();
    if (next && state.phase !== "live") return;
    setOpen(next);
    setPaused(next);
    setOutId(null);
    setInId(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP") toggle(!open);
      if (e.code === "Escape" && open) toggle(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const confirm = () => {
    if (!outId || !inId) return;
    substitute(outId, inId);
    toggle(false);
  };

  const subsLeft = MAX_SUBS - subsUsed;

  if (!open) {
    return (
      <div className="absolute bottom-4 right-4">
        <button
          className="pointer-events-auto rounded-md bg-black/60 px-3 py-2 font-sans text-sm text-white transition-colors hover:bg-black/80"
          onClick={() => toggle(true)}
          disabled={phase !== "live"}
        >
          Substitutions (P) &middot; {subsLeft} left
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 font-sans">
      <div className="w-[480px] max-w-[92vw] rounded-xl bg-neutral-900 p-5 text-white shadow-2xl ring-1 ring-white/10">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Substitution</h2>
          <span className="text-xs text-neutral-400">
            {subsLeft} of {MAX_SUBS} remaining &middot; match paused
          </span>
        </div>

        {subsLeft === 0 ? (
          <p className="py-6 text-center text-neutral-400">
            All {MAX_SUBS} substitutions used.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Off (on pitch)
              </h3>
              {/* slice(1): the GK holds slot 0 and cannot be substituted */}
              {starters.slice(1).map((id) => (
                <PlayerRow
                  key={id}
                  id={id}
                  selected={outId === id}
                  onClick={() => setOutId(id)}
                />
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                On (bench)
              </h3>
              {bench.map((id) => {
                const unavailable = subbedOff.includes(id);
                return (
                  <PlayerRow
                    key={id}
                    id={id}
                    selected={inId === id}
                    disabled={unavailable}
                    note={unavailable ? "already played" : undefined}
                    onClick={() => !unavailable && setInId(id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md px-4 py-2 text-sm text-neutral-300 hover:bg-white/10"
            onClick={() => toggle(false)}
          >
            Resume (Esc)
          </button>
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!outId || !inId || subsLeft === 0}
            onClick={confirm}
          >
            Confirm swap
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  id,
  selected,
  disabled,
  note,
  onClick,
}: {
  id: string;
  selected: boolean;
  disabled?: boolean;
  note?: string;
  onClick: () => void;
}) {
  const info = PLAYER_INFO[id];
  return (
    <button
      className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? "bg-emerald-600/90"
          : disabled
            ? "bg-white/5 text-neutral-500"
            : "bg-white/10 hover:bg-white/20"
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="inline-block w-6 text-center font-bold tabular-nums">
        {info?.number ?? "?"}
      </span>
      <span className="flex-1">{info?.name ?? id}</span>
      {note && <span className="text-[10px] uppercase">{note}</span>}
    </button>
  );
}
