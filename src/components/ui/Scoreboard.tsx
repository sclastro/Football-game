import { useEffect, useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Top-of-screen scoreboard: FLAG SHORT  score-score  SHORT FLAG + countdown. */
export function Scoreboard() {
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const awayTeamId = useGameStore((s) => s.awayTeamId);
  const score = useGameStore((s) => s.score);
  const clock = useGameStore((s) => s.clock);
  const phase = useGameStore((s) => s.phase);

  const home = TEAMS[homeTeamId];
  const away = TEAMS[awayTeamId];

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 select-none font-sans">
      <div className="flex items-stretch overflow-hidden rounded-lg shadow-lg ring-1 ring-black/20">
        <TeamCell color={home.kitColor} flag={home.flag} short={home.short} />
        <div className="flex flex-col items-center justify-center bg-neutral-900 px-4 py-1.5 text-white">
          <div className="text-2xl font-bold leading-none tracking-wider tabular-nums">
            {score.home} <span className="text-neutral-500">-</span> {score.away}
          </div>
          <div className="mt-0.5 text-xs font-medium tabular-nums text-emerald-400">
            {phase === "fulltime" ? "FULL TIME" : formatClock(clock)}
          </div>
        </div>
        <TeamCell color={away.kitColor} flag={away.flag} short={away.short} />
      </div>
    </div>
  );
}

function TeamCell({
  color,
  flag,
  short,
}: {
  color: string;
  flag: string;
  short: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5"
      style={{ backgroundColor: color, color: readableText(color) }}
    >
      <span className="text-lg leading-none">{flag}</span>
      <span className="text-lg font-bold tracking-wide">{short}</span>
    </div>
  );
}

/** Pick black/white text for contrast against a hex background. */
function readableText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111" : "#fff";
}

/** Big centre-screen GOAL! flash, shown briefly after a goal. */
export function GoalFlash() {
  const [visible, setVisible] = useState(false);

  // Drive the flash from store changes so all state updates happen inside
  // subscription/timeout callbacks (never synchronously in render or effect).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.goalFlashUntil === prev.goalFlashUntil) return;
      const remainingMs = state.goalFlashUntil * 1000 - performance.now();
      if (remainingMs <= 0) return;
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), remainingMs);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="animate-pulse text-7xl font-black tracking-wider text-pink-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]">
        GOAL!
      </span>
    </div>
  );
}
