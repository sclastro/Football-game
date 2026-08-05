import { useState } from "react";
import { useGameStore, shootoutGoals } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import type { ControlMode } from "@/game/state/types";
import { audio } from "@/game/systems/audio";

/** A centred modal card, shared by every match overlay. */
function Card({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/65 font-sans text-white backdrop-blur-sm">
      <div className="w-[380px] max-w-[90vw] rounded-2xl bg-neutral-900 p-6 text-center ring-1 ring-white/10">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
          {kicker}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Score line with both flags, used across the break/result cards. */
function ScoreLine() {
  const score = useGameStore((s) => s.score);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  return (
    <div className="my-3 flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
      <span>{home.flag}</span>
      <span>
        {score.home} - {score.away}
      </span>
      <span>{away.flag}</span>
    </div>
  );
}

/** "Level at the whistle — extra time" card, shown between the periods. */
export function ExtraTimeOverlay() {
  const phase = useGameStore((s) => s.phase);
  const beginExtraTime = useGameStore((s) => s.beginExtraTime);
  const duration = useGameStore((s) => s.matchDuration);
  if (phase !== "extraTimeBreak") return null;

  const added = duration === 120 ? 60 : duration === 300 ? 120 : 90;

  return (
    <Card kicker="Level at full time">
      <div className="my-2 text-4xl font-black tracking-tight text-yellow-300">
        EXTRA TIME
      </div>
      <ScoreLine />
      <p className="mb-5 text-sm text-white/60">
        {Math.round(added / 60) === added / 60
          ? `${added / 60} more minute${added / 60 > 1 ? "s" : ""}`
          : `${added} more seconds`}{" "}
        to settle it.
      </p>
      <button
        className="rounded-full bg-yellow-400 px-8 py-2.5 font-black text-emerald-950 hover:bg-yellow-300 active:scale-95"
        onClick={beginExtraTime}
      >
        PLAY ON ▶
      </button>
    </Card>
  );
}

/** "Still level — penalties" card, shown before the shootout begins. */
export function ShootoutIntroOverlay() {
  const phase = useGameStore((s) => s.phase);
  const beginShootout = useGameStore((s) => s.beginShootout);
  if (phase !== "shootoutIntro") return null;

  return (
    <Card kicker="Still level">
      <div className="my-2 text-4xl font-black tracking-tight text-red-400">
        PENALTIES
      </div>
      <ScoreLine />
      <p className="mb-5 text-sm leading-relaxed text-white/60">
        Five kicks each. You choose where to shoot — and which way to dive when
        you're in goal.
      </p>
      <button
        className="rounded-full bg-yellow-400 px-8 py-2.5 font-black text-emerald-950 hover:bg-yellow-300 active:scale-95"
        onClick={beginShootout}
      >
        TO THE SPOT ▶
      </button>
    </Card>
  );
}

/** Full-time result card with a way back to the menu / rematch. */
export function FullTimeOverlay() {
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const shootout = useGameStore((s) => s.shootout);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  const backToMenu = useGameStore((s) => s.backToMenu);
  const rematch = useGameStore((s) => s.rematch);

  if (phase !== "fulltime") return null;

  const penHome = shootout ? shootoutGoals(shootout, "home") : 0;
  const penAway = shootout ? shootoutGoals(shootout, "away") : 0;
  const decidedOnPens = !!shootout && penHome !== penAway;

  const homeWon = decidedOnPens ? penHome > penAway : score.home > score.away;
  const awayWon = decidedOnPens ? penAway > penHome : score.away > score.home;
  const result = homeWon
    ? `${home.name} win!`
    : awayWon
      ? `${away.name} win!`
      : "It's a draw";

  return (
    <Card kicker="Full time">
      <ScoreLine />
      {decidedOnPens && (
        <div className="-mt-1 mb-2 text-sm font-bold text-yellow-300">
          {penHome} - {penAway} on penalties
        </div>
      )}
      <div className="mb-5 text-lg font-semibold">{result}</div>
      <div className="flex justify-center gap-2">
        <button
          className="rounded-full bg-yellow-400 px-5 py-2 font-bold text-emerald-950 hover:bg-yellow-300 active:scale-95"
          onClick={rematch}
        >
          Rematch
        </button>
        <button
          className="rounded-full bg-white/10 px-5 py-2 font-semibold hover:bg-white/20 active:scale-95"
          onClick={backToMenu}
        >
          Menu
        </button>
      </div>
    </Card>
  );
}

/** Small gear button that opens in-match settings (controls + quit). */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const controlMode = useGameStore((s) => s.controlMode);
  const setControlMode = useGameStore((s) => s.setControlMode);
  const showIntent = useGameStore((s) => s.showIntent);
  const toggleShowIntent = useGameStore((s) => s.toggleShowIntent);
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
                {m === "keyboard" ? "Keyboard" : "Touch"}
              </button>
            ))}
          </div>
          <button
            className="mb-2 flex w-full items-center justify-between rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              audio.setEnabled(next);
            }}
          >
            <span>Sound</span>
            <span>{soundOn ? "🔊 On" : "🔈 Off"}</span>
          </button>
          <button
            className="mb-2 flex w-full items-center justify-between rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20"
            onClick={toggleShowIntent}
          >
            <span>AI intent</span>
            <span>{showIntent ? "👁 On" : "Off"}</span>
          </button>
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
