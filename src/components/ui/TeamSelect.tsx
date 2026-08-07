import { useState } from "react";
import { useGameStore, DURATION_OPTIONS } from "@/game/state/gameStore";
import { TEAMS, TEAM_IDS } from "@/game/data/teams";
import {
  teamRating,
  starPlayers,
  teamStyle,
} from "@/game/data/teamStrength";
import {
  DIFFICULTY_IDS,
  DIFFICULTY_LABELS,
  type Difficulty,
} from "@/game/data/difficulty";
import type { ControlMode } from "@/game/state/types";
import { Screen, SectionTitle, Headline, Pill, BackButton } from "./Screen";
import { Flag } from "./Flag";
import { StarIcon } from "./Icons";

/**
 * Layer 2: pick your nation, match length, difficulty and control scheme.
 *
 * The nation grid used to be flat blocks of kit colour — a wall. These are
 * cards: flag, name, rating, the squad's best-known names and a style label, so
 * choosing a side is a decision rather than picking a colour.
 */
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

  // Highlighting on hover/focus tints the whole screen, so you can feel the
  // nation before you commit to it.
  const [preview, setPreview] = useState<string | null>(null);
  const tint = TEAMS[preview ?? homeTeamId]?.kitColor;

  return (
    <Screen tint={tint}>
      <BackButton onClick={() => setScreen("title")} />

      <div className="pp-rise mt-3">
        <Headline>Choose your nation</Headline>
        <p className="mt-1.5 text-center text-xs text-emerald-300/70">
          Your opponent is drawn at random.
        </p>
      </div>

      <div className="pp-rise mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TEAM_IDS.map((id) => {
          const t = TEAMS[id];
          const selected = id === homeTeamId;
          return (
            <button
              key={id}
              onClick={() => chooseTeam(id)}
              onPointerEnter={() => setPreview(id)}
              onPointerLeave={() => setPreview(null)}
              onFocus={() => setPreview(id)}
              onBlur={() => setPreview(null)}
              className={`group relative overflow-hidden rounded-xl p-3 text-left ring-1 backdrop-blur-sm transition active:scale-95 ${
                selected
                  ? "bg-white/15 ring-yellow-300/80 shadow-[0_8px_28px_-10px_rgba(250,204,21,0.8)]"
                  : "bg-white/[0.07] ring-white/10 hover:bg-white/[0.13] hover:ring-white/25"
              }`}
            >
              {/* Kit-colour wash along the top edge of the card */}
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: t.kitColor }}
              />
              <span
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                style={{ backgroundColor: t.kitColor }}
              />

              <span className="relative flex items-center gap-2.5">
                <Flag id={id} width={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black leading-tight">
                    {t.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-white/45">
                    {teamStyle(id)}
                  </span>
                </span>
                <span className="flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-1 text-xs font-black tabular-nums">
                  <StarIcon className="h-2.5 w-2.5 text-yellow-300" />
                  {teamRating(id)}
                </span>
              </span>

              <span className="relative mt-2 block truncate text-[11px] leading-tight text-white/55">
                {starPlayers(id, 3).join(" · ")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pp-rise mt-7">
        <SectionTitle>Match length</SectionTitle>
        <div className="flex justify-center gap-2">
          {DURATION_OPTIONS.map((d) => (
            <Pill
              key={d}
              active={duration === d}
              onClick={() => setMatchDuration(d)}
            >
              {Math.round(d / 60)} min
            </Pill>
          ))}
        </div>
      </div>

      <div className="pp-rise mt-6">
        <SectionTitle>Difficulty</SectionTitle>
        <div className="flex justify-center gap-2">
          {DIFFICULTY_IDS.map((d: Difficulty) => (
            <Pill
              key={d}
              active={difficulty === d}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABELS[d]}
            </Pill>
          ))}
        </div>
      </div>

      <div className="pp-rise mt-6">
        <SectionTitle>Controls</SectionTitle>
        <div className="flex justify-center gap-2">
          {(["joystick", "keyboard"] as ControlMode[]).map((m) => (
            <Pill
              key={m}
              active={controlMode === m}
              onClick={() => setControlMode(m)}
            >
              {m === "keyboard" ? "Keyboard" : "Touch"}
            </Pill>
          ))}
        </div>
        <p className="mx-auto mt-3 max-w-lg text-center text-[11px] leading-relaxed text-emerald-200/55">
          {controlMode === "keyboard"
            ? "WASD move · Shift sprint · click a team-mate to select, again to take over · click yourself to call for the ball · E pass · hold Space to shoot"
            : "Left stick moves · tap a team-mate to select (tap again to take over) · tap yourself to call for the ball · PASS sends it · drag SHOOT to aim and fire"}
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-white/40">
        Tap a nation to continue
      </p>
    </Screen>
  );
}
