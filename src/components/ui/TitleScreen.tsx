import { useGameStore, DURATION_OPTIONS } from "@/game/state/gameStore";
import { audio } from "@/game/systems/audio";
import { MenuBackground } from "./MenuBackground";
import { Pill } from "./Screen";
import { Flag } from "./Flag";
import { TEAMS } from "@/game/data/teams";
import {
  DIFFICULTY_IDS,
  DIFFICULTY_LABELS,
  type Difficulty,
} from "@/game/data/difficulty";
import type { ControlMode, GameMode } from "@/game/state/types";
import { PlayIcon, ClockIcon, BoltIcon, StarIcon } from "./Icons";
import { useState } from "react";

interface ModeCard {
  id: GameMode;
  title: string;
  line: string;
  blurb: string;
  tone: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}

const MODES: ModeCard[] = [
  {
    id: "match",
    title: "Match",
    line: "Eleven a side",
    blurb:
      "Build your nation's eleven, scout the side you are drawn against, and play it out — extra time and penalties included.",
    tone: "from-emerald-400/30",
    Icon: PlayIcon,
  },
  {
    id: "shootout",
    title: "Penalty Shootout",
    line: "Twelve yards, nothing else",
    blurb:
      "Behind the keeper, facing the goal. Drag your circle into a corner and hope. Then keep one out yourself.",
    tone: "from-rose-400/30",
    Icon: BoltIcon,
  },
  {
    id: "tutorial",
    title: "Training ground",
    line: "Learn every control",
    blurb:
      "Ten short lessons — moving, shooting, passing, the rainbow flick, sliding in, and why the ball never goes out.",
    tone: "from-sky-400/30",
    Icon: StarIcon,
  },
];

/**
 * The front page.
 *
 * Three ways in rather than one START button, plus the settings that used to be
 * buried on the nation screen — match length, difficulty and control scheme all
 * apply to whichever mode you pick, so they belong here.
 */
export function TitleScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);
  const startShootout = useGameStore((s) => s.startShootout);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const duration = useGameStore((s) => s.matchDuration);
  const setMatchDuration = useGameStore((s) => s.setMatchDuration);
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const controlMode = useGameStore((s) => s.controlMode);
  const setControlMode = useGameStore((s) => s.setControlMode);

  const [hovered, setHovered] = useState<GameMode | null>(null);
  const tint = TEAMS[homeTeamId]?.kitColor;

  const launch = (mode: GameMode) => {
    audio.resume(); // unlock the audio context from this user gesture
    setMode(mode);
    if (mode === "shootout") startShootout();
    else if (mode === "tutorial") startTutorial();
    else setScreen("teamSelect");
  };

  return (
    <div className="absolute inset-0 flex flex-col font-sans text-white">
      <MenuBackground tint={tint} />
      <div className="pp-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8">
          <div className="my-auto w-full">
            {/* --- Wordmark ------------------------------------------------ */}
            <div className="pp-rise text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-300/80">
                World Football
              </div>
              <h1 className="mt-2 bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:text-7xl">
                PIXEL PITCH
              </h1>
              <div
                className="mx-auto mt-3 h-1 w-40 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent"
                style={{ animation: "pp-glow 2.6s ease-in-out infinite" }}
              />
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
                Playing as
                <Flag id={homeTeamId} width={20} />
                <span className="font-bold text-white/80">
                  {TEAMS[homeTeamId]?.name}
                </span>
              </p>
            </div>

            {/* --- Modes --------------------------------------------------- */}
            <div className="pp-rise mt-8 space-y-2.5" style={{ animationDelay: "0.1s" }}>
              {MODES.map(({ id, title, line, blurb, tone, Icon }) => (
                <button
                  key={id}
                  onClick={() => launch(id)}
                  onPointerEnter={() => setHovered(id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered(null)}
                  className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-4 text-left ring-1 backdrop-blur-sm transition active:scale-[0.98] ${
                    hovered === id
                      ? "bg-white/[0.14] ring-yellow-300/60"
                      : "bg-white/[0.07] ring-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${tone} to-transparent opacity-60 transition group-hover:opacity-100`}
                  />
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/15">
                    <Icon className="h-5 w-5 text-yellow-300" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-lg font-black leading-tight">
                      {title}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">
                      {line}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-white/55">
                      {blurb}
                    </span>
                  </span>
                  <span className="relative shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-yellow-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                      <path
                        d="M9 5l7 7-7 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              ))}
            </div>

            {/* --- Settings ------------------------------------------------ */}
            <div
              className="pp-rise mt-8 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 backdrop-blur-sm"
              style={{ animationDelay: "0.2s" }}
            >
              <Setting icon={<ClockIcon className="h-3.5 w-3.5" />} label="Match length">
                {DURATION_OPTIONS.map((d) => (
                  <Pill
                    key={d}
                    active={duration === d}
                    onClick={() => setMatchDuration(d)}
                  >
                    {Math.round(d / 60)} min
                  </Pill>
                ))}
              </Setting>

              <Setting icon={<BoltIcon className="h-3.5 w-3.5" />} label="Difficulty">
                {DIFFICULTY_IDS.map((d: Difficulty) => (
                  <Pill
                    key={d}
                    active={difficulty === d}
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </Pill>
                ))}
              </Setting>

              <Setting label="Controls">
                {(["joystick", "keyboard"] as ControlMode[]).map((m) => (
                  <Pill
                    key={m}
                    active={controlMode === m}
                    onClick={() => setControlMode(m)}
                  >
                    {m === "keyboard" ? "Keyboard" : "Touch"}
                  </Pill>
                ))}
              </Setting>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-emerald-200/55">
                {controlMode === "keyboard"
                  ? "WASD move · Shift sprint · hold Space (or J) to shoot · Q flick · F slide · click a team-mate to select, again to pass or take over"
                  : "Left stick moves · drag SHOOT for power · SLIDE, SPRINT and FLICK on the right · tap a team-mate to select, tap again to pass to them"}
              </p>
              <p className="mt-1.5 text-center text-[11px] text-white/35">
                Difficulty changes who you are drawn against, how they set up,
                and how sharp they are.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Setting({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="flex w-28 shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        {icon}
        {label}
      </span>
      <span className="flex flex-wrap gap-2">{children}</span>
    </div>
  );
}
