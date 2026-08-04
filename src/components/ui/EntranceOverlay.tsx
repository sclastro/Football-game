import { useEffect, useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { DIFFICULTY_LABELS } from "@/game/data/difficulty";

/**
 * The broadcast lower-third shown over the walk-out: flags, nation names and a
 * SKIP button for when you just want to play.
 */
export function EntranceOverlay() {
  const phase = useGameStore((s) => s.phase);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  const difficulty = useGameStore((s) => s.difficulty);
  const beginPlay = useGameStore((s) => s.beginPlay);
  const [shown, setShown] = useState(false);

  // Fade the card in a beat after the walk-out starts.
  useEffect(() => {
    if (phase !== "entrance") {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), 500);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase !== "entrance") return null;

  return (
    <div className="pointer-events-none absolute inset-0 font-sans text-white">
      <style>{`
        @keyframes pp-in { from { opacity:0; transform: translateY(24px) } to { opacity:1; transform:none } }
      `}</style>

      <button
        onClick={beginPlay}
        className="pointer-events-auto absolute right-4 top-4 rounded-full bg-black/60 px-5 py-2 text-sm font-bold ring-1 ring-white/25 backdrop-blur-sm hover:bg-black/80 active:scale-95"
      >
        SKIP ▶
      </button>

      {shown && (
        <div
          className="absolute inset-x-0 bottom-12 mx-auto w-[min(94vw,560px)] rounded-2xl bg-neutral-950/80 p-5 text-center ring-1 ring-white/15 backdrop-blur-md"
          style={{ animation: "pp-in .6s ease-out both" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-300">
            Matchday
          </div>
          <div className="mt-3 flex items-center justify-center gap-5">
            <Team flag={home.flag} name={home.name} color={home.kitColor} />
            <span className="text-2xl font-black text-white/40">vs</span>
            <Team flag={away.flag} name={away.name} color={away.kitColor} />
          </div>
          <div className="mt-3 text-xs text-white/50">
            {DIFFICULTY_LABELS[difficulty]} difficulty
          </div>
        </div>
      )}
    </div>
  );
}

function Team({
  flag,
  name,
  color,
}: {
  flag: string;
  name: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl leading-none">{flag}</span>
      <span className="text-lg font-black tracking-tight">{name}</span>
      <span
        className="h-1 w-12 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
