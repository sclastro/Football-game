import { useState } from "react";
import { useGameStore, DURATION_OPTIONS } from "@/game/state/gameStore";
import { TEAMS, TEAM_IDS, DEFAULT_HOME_TEAM } from "@/game/data/teams";
import type { ControlMode } from "@/game/state/types";

function readableText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
}

function label(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** Opening screen: pick your nation, match length and control scheme. */
export function StartMenu() {
  const startMatch = useGameStore((s) => s.startMatch);
  const controlMode = useGameStore((s) => s.controlMode);
  const setControlMode = useGameStore((s) => s.setControlMode);

  const [teamId, setTeamId] = useState(DEFAULT_HOME_TEAM);
  const [duration, setDuration] = useState<number>(180);

  return (
    <div className="absolute inset-0 overflow-auto bg-gradient-to-b from-emerald-900 via-emerald-800 to-neutral-900 font-sans text-white">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center px-5 py-8">
        <h1 className="text-4xl font-black tracking-tight drop-shadow">
          PIXEL PITCH
        </h1>
        <p className="mb-6 text-sm text-emerald-200/80">
          3D pixel-art football &middot; single player
        </p>

        <Section title="Choose your nation">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TEAM_IDS.map((id) => {
              const t = TEAMS[id];
              const selected = id === teamId;
              return (
                <button
                  key={id}
                  onClick={() => setTeamId(id)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-3 ring-2 transition ${
                    selected
                      ? "ring-yellow-300"
                      : "ring-transparent hover:ring-white/30"
                  }`}
                  style={{
                    backgroundColor: t.kitColor,
                    color: readableText(t.kitColor),
                  }}
                >
                  <span className="text-2xl leading-none">{t.flag}</span>
                  <span className="text-xs font-bold">{t.short}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-emerald-200/70">
            Your opponent is drawn at random.
          </p>
        </Section>

        <Section title="Match length">
          <div className="flex justify-center gap-2">
            {DURATION_OPTIONS.map((d) => (
              <Pill key={d} active={duration === d} onClick={() => setDuration(d)}>
                {label(d)}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Controls">
          <div className="flex justify-center gap-2">
            {(["keyboard", "joystick"] as ControlMode[]).map((m) => (
              <Pill
                key={m}
                active={controlMode === m}
                onClick={() => setControlMode(m)}
              >
                {m === "keyboard" ? "Keyboard" : "Touch joystick"}
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-emerald-200/70">
            {controlMode === "keyboard"
              ? "WASD move · Shift sprint · E pass · hold Space to shoot"
              : "On-screen stick + Pass / Shoot buttons (best on mobile)"}
          </p>
        </Section>

        <button
          onClick={() => startMatch(teamId, duration)}
          className="mt-8 rounded-full bg-yellow-400 px-10 py-3 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-yellow-300 active:scale-95"
        >
          KICK OFF ▶
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 w-full">
      <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-emerald-300">
        {title}
      </h2>
      {children}
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
      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-yellow-400 text-emerald-950"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}
