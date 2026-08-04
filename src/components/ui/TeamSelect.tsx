import { useGameStore, DURATION_OPTIONS } from "@/game/state/gameStore";
import { TEAMS, TEAM_IDS } from "@/game/data/teams";
import {
  DIFFICULTY_IDS,
  DIFFICULTY_LABELS,
  type Difficulty,
} from "@/game/data/difficulty";
import type { ControlMode } from "@/game/state/types";

function readableText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}

/** Layer 2: pick your nation, match length, difficulty and control scheme. */
export function TeamSelect() {
  const setScreen = useGameStore((s) => s.setScreen);
  const chooseTeam = useGameStore((s) => s.chooseTeam);
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const duration = useGameStore((s) => s.matchDuration);
  const setMatchDuration = useGameStore((s) => s.setMatchDuration);
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const controlMode = useGameStore((s) => s.controlMode);
  const setControlMode = useGameStore((s) => s.setControlMode);

  return (
    <div className="absolute inset-0 overflow-auto bg-gradient-to-b from-emerald-950 via-emerald-900 to-neutral-950 font-sans text-white">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 py-6">
        <button
          onClick={() => setScreen("title")}
          className="mb-2 self-start rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20"
        >
          ‹ Back
        </button>

        <h1 className="text-center text-3xl font-black tracking-tight">
          Choose your nation
        </h1>
        <p className="mb-5 text-center text-xs text-emerald-300/70">
          Your opponent is drawn at random.
        </p>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {TEAM_IDS.map((id) => {
            const t = TEAMS[id];
            const selected = id === homeTeamId;
            return (
              <button
                key={id}
                onClick={() => chooseTeam(id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3.5 ring-2 transition active:scale-95 ${
                  selected
                    ? "ring-yellow-300"
                    : "ring-transparent hover:ring-white/40"
                }`}
                style={{
                  backgroundColor: t.kitColor,
                  color: readableText(t.kitColor),
                }}
              >
                <span className="text-3xl leading-none">{t.flag}</span>
                <span className="text-xs font-black tracking-wide">{t.short}</span>
              </button>
            );
          })}
        </div>

        <Section title="Match length">
          {DURATION_OPTIONS.map((d) => (
            <Pill
              key={d}
              active={duration === d}
              onClick={() => setMatchDuration(d)}
            >
              {Math.round(d / 60)} min
            </Pill>
          ))}
        </Section>

        <Section title="Difficulty">
          {DIFFICULTY_IDS.map((d: Difficulty) => (
            <Pill
              key={d}
              active={difficulty === d}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABELS[d]}
            </Pill>
          ))}
        </Section>

        <Section title="Controls">
          {(["joystick", "keyboard"] as ControlMode[]).map((m) => (
            <Pill
              key={m}
              active={controlMode === m}
              onClick={() => setControlMode(m)}
            >
              {m === "keyboard" ? "Keyboard" : "Touch"}
            </Pill>
          ))}
        </Section>

        <p className="mt-3 text-center text-xs leading-relaxed text-emerald-200/60">
          {controlMode === "keyboard"
            ? "WASD move · Shift sprint · click a teammate to select, click again to take over · E pass · hold Space to shoot"
            : "Left stick moves · tap a teammate to select (tap again to take over) · PASS sends it · drag SHOOT to aim and fire"}
        </p>

        <p className="mt-6 text-center text-sm text-white/50">
          Tap a nation to continue →
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/80">
        {title}
      </h2>
      <div className="flex justify-center gap-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${
        active
          ? "bg-yellow-400 text-emerald-950"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}
