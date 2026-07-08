import { useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import type { ControlMode } from "@/game/state/types";

/** Full-time result card with a way back to the menu / rematch. */
export function FullTimeOverlay() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  const backToMenu = useGameStore((s) => s.backToMenu);
  const startMatch = useGameStore((s) => s.startMatch);
  const duration = useGameStore((s) => s.matchDuration);

  if (phase !== "fulltime") return null;

  const result =
    score.home > score.away
      ? `${home.name} win!`
      : score.away > score.home
        ? `${away.name} win!`
        : "It's a draw";

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 font-sans text-white">
      <div className="w-[360px] max-w-[90vw] rounded-2xl bg-neutral-900 p-6 text-center ring-1 ring-white/10">
        <div className="text-xs uppercase tracking-widest text-emerald-300">
          Full time
        </div>
        <div className="my-3 flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
          <span>{home.flag}</span>
          <span>
            {score.home} - {score.away}
          </span>
          <span>{away.flag}</span>
        </div>
        <div className="mb-5 text-lg font-semibold">{result}</div>
        <div className="flex justify-center gap-2">
          <button
            className="rounded-full bg-yellow-400 px-5 py-2 font-bold text-emerald-950 hover:bg-yellow-300"
            onClick={() => startMatch(home.id, duration)}
          >
            Rematch
          </button>
          <button
            className="rounded-full bg-white/10 px-5 py-2 font-semibold hover:bg-white/20"
            onClick={backToMenu}
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small gear button that opens in-match settings (controls + quit). */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const controlMode = useGameStore((s) => s.controlMode);
  const setControlMode = useGameStore((s) => s.setControlMode);
  const backToMenu = useGameStore((s) => s.backToMenu);

  return (
    <>
      <button
        className="pointer-events-auto absolute right-3 top-14 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white hover:bg-black/70"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-24 w-56 rounded-lg bg-neutral-900/95 p-3 text-sm text-white ring-1 ring-white/10">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
            Controls
          </div>
          <div className="mb-3 flex gap-2">
            {(["keyboard", "joystick"] as ControlMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setControlMode(m)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                  controlMode === m
                    ? "bg-yellow-400 text-emerald-950"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {m === "keyboard" ? "Keyboard" : "Joystick"}
              </button>
            ))}
          </div>
          <button
            className="w-full rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20"
            onClick={backToMenu}
          >
            Quit to menu
          </button>
        </div>
      )}
    </>
  );
}
