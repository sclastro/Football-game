import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { briefingFor, identityOf, tunedIdentity } from "@/game/data/tactics";
import { teamRating } from "@/game/data/teamStrength";
import { DIFFICULTY_LABELS } from "@/game/data/difficulty";
import { Screen, SectionTitle, Headline, BackButton } from "./Screen";
import { Flag } from "./Flag";
import { StarIcon } from "./Icons";

/** The five dials shown as bars, in the order they matter to the user. */
const DIALS: [string, keyof ReturnType<typeof tunedIdentity>, string, string][] = [
  ["Press height", "pressHeight", "Sits deep", "Presses your keeper"],
  ["Tempo", "tempo", "Patient", "One touch"],
  ["Directness", "directness", "Through the lines", "Straight over the top"],
  ["Width", "width", "Narrow", "Touchline to touchline"],
  ["Risk", "risk", "Waits for the chance", "Shoots on sight"],
];

/**
 * The scouting report on whoever you have been drawn against.
 *
 * This is the last thing between picking a squad and kicking off, and it is the
 * only place the opposition's shape, dials and danger man are laid out — the
 * game deliberately never labels any of that during a match.
 */
export function Briefing() {
  const setScreen = useGameStore((s) => s.setScreen);
  const startMatch = useGameStore((s) => s.startMatch);
  const scoutOpponent = useGameStore((s) => s.scoutOpponent);
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const awayTeamId = useGameStore((s) => s.awayTeamId);
  const awayFormationId = useGameStore((s) => s.awayFormationId);
  const difficulty = useGameStore((s) => s.difficulty);
  const mode = useGameStore((s) => s.mode);

  const home = TEAMS[homeTeamId];
  const away = TEAMS[awayTeamId];
  const brief = briefingFor(awayTeamId, difficulty, "match", awayFormationId);
  const tuned = tunedIdentity(awayTeamId, difficulty);
  const base = identityOf(awayTeamId);

  return (
    <Screen
      tint={away?.kitColor}
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={scoutOpponent}
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
          >
            Draw again
          </button>
          <div className="flex-1" />
          <button
            onClick={startMatch}
            className="rounded-full bg-yellow-400 px-8 py-2.5 text-sm font-black text-emerald-950 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.8)] transition hover:bg-yellow-300 active:scale-95"
          >
            Kick off
          </button>
        </div>
      }
    >
      <BackButton onClick={() => setScreen("squad")} />

      <div className="pp-rise mt-3">
        <SectionTitle>
          {mode === "shootout" ? "Shootout" : `${DIFFICULTY_LABELS[difficulty]} fixture`}
        </SectionTitle>
        <div className="flex items-center justify-center gap-4">
          <div className="text-right">
            <div className="text-sm font-black">{home?.name}</div>
            <div className="text-[10px] text-white/45">You</div>
          </div>
          <Flag id={homeTeamId} width={34} />
          <span className="text-xs font-black text-white/40">V</span>
          <Flag id={awayTeamId} width={34} />
          <div>
            <div className="text-sm font-black">{away?.name}</div>
            <div className="text-[10px] text-white/45">
              Rated {teamRating(awayTeamId)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Headline>{brief.headline}</Headline>
        </div>
      </div>

      {/* --- The one thing to remember ------------------------------------- */}
      <div className="pp-rise mt-5 rounded-2xl bg-yellow-400/10 p-4 ring-1 ring-yellow-300/40">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300/80">
          How to beat them
        </div>
        <p className="mt-1.5 text-sm font-semibold leading-relaxed">
          {brief.keyPoint}
        </p>
      </div>

      {/* --- Shape --------------------------------------------------------- */}
      <div className="pp-rise mt-6">
        <SectionTitle>Their shape</SectionTitle>
        <div className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black tracking-tight">
              {brief.formationName}
            </span>
            <span className="text-xs text-white/55">{brief.formationSummary}</span>
          </div>
        </div>
      </div>

      {/* --- Dials --------------------------------------------------------- */}
      <div className="pp-rise mt-6">
        <SectionTitle>How they play</SectionTitle>
        <div className="space-y-3 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          {DIALS.map(([label, key, low, high]) => {
            const value = tuned[key] as number;
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/45">
                  <span>{low}</span>
                  <span className="text-emerald-300/80">{label}</span>
                  <span>{high}</span>
                </div>
                <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 w-1.5 rounded-full bg-gradient-to-b from-white to-emerald-300"
                    style={{ left: `calc(${value * 100}% - 3px)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Notes --------------------------------------------------------- */}
      <div className="pp-rise mt-6">
        <SectionTitle>Scouting notes</SectionTitle>
        <ul className="space-y-2">
          {brief.points.map((point, i) => (
            <li
              key={i}
              className="flex gap-2.5 rounded-xl bg-white/[0.05] p-3 text-[13px] leading-relaxed text-white/75 ring-1 ring-white/10"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* --- Danger man ---------------------------------------------------- */}
      <div className="pp-rise mt-6">
        <SectionTitle>Danger man</SectionTitle>
        <div className="flex gap-3 rounded-xl bg-rose-500/10 p-4 ring-1 ring-rose-400/30">
          <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <p className="text-[13px] leading-relaxed text-white/80">
            {brief.danger}
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-emerald-200/50">
        {base.label} at every difficulty — but on{" "}
        {DIFFICULTY_LABELS[difficulty]} the dials above are where they actually
        sit today.
      </p>
    </Screen>
  );
}
