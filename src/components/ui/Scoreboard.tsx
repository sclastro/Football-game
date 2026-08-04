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
      <div className="flex items-stretch overflow-hidden rounded-md shadow-xl ring-1 ring-white/10">
        {/* Colour accent bars either side */}
        <div className="w-1.5" style={{ backgroundColor: home.kitColor }} />
        <TeamCell color={home.kitColor} flag={home.flag} short={home.short} />
        <div className="flex flex-col items-center justify-center bg-neutral-950/80 px-3 py-1 backdrop-blur-md">
          <div className="text-[26px] font-black leading-none tracking-wide tabular-nums text-white">
            {score.home}<span className="mx-1 text-neutral-600">:</span>{score.away}
          </div>
        </div>
        <TeamCell color={away.kitColor} flag={away.flag} short={away.short} />
        <div className="w-1.5" style={{ backgroundColor: away.kitColor }} />
      </div>
      {/* Timer pill under the score */}
      <div className="mx-auto -mt-0.5 w-fit rounded-b-md bg-neutral-950/80 px-3 pb-0.5 pt-1 backdrop-blur-md">
        <span
          className={`text-xs font-bold tabular-nums tracking-widest ${
            phase === "fulltime"
              ? "text-red-400"
              : phase === "extraTime" || phase === "extraTimeBreak"
                ? "text-amber-300"
                : phase === "shootout" || phase === "shootoutIntro"
                  ? "text-sky-300"
                  : "text-emerald-400"
          }`}
        >
          {phase === "fulltime"
            ? "FULL TIME"
            : phase === "shootout" || phase === "shootoutIntro"
              ? "PENALTIES"
              : phase === "extraTime" || phase === "extraTimeBreak"
                ? `ET ⏱ ${formatClock(clock)}`
                : `⏱ ${formatClock(clock)}`}
        </span>
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
    <div className="flex items-center gap-2 bg-neutral-900/80 px-3 py-1.5 text-white backdrop-blur-md">
      <span className="text-xl leading-none">{flag}</span>
      <span className="text-lg font-extrabold tracking-wide">{short}</span>
      <span
        className="ml-0.5 h-4 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
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
