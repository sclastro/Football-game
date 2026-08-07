import { useGameStore, SHOOTOUT_KICKS, shootoutGoals } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { Flag } from "./Flag";
import { ArrowLeftIcon, ArrowUpIcon, ArrowRightIcon } from "./Icons";
import type { PenaltyDirection, PenaltyOutcome } from "@/game/state/types";

/** What to shout when a kick resolves, from the user's point of view. */
function outcomeLabel(
  outcome: PenaltyOutcome,
  userWasShooting: boolean,
): string {
  switch (outcome) {
    case "goal":
      return "GOAL!";
    case "post":
      return "OFF THE POST!";
    case "wide":
      return userWasShooting ? "MISSED!" : "THEY MISSED!";
    case "saved":
      return userWasShooting ? "SAVED!" : "SAVED BY YOU!";
  }
}

const DIRECTIONS: {
  dir: PenaltyDirection;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { dir: "left", label: "Left", Icon: ArrowLeftIcon },
  { dir: "centre", label: "Centre", Icon: ArrowUpIcon },
  { dir: "right", label: "Right", Icon: ArrowRightIcon },
];

/** One kick's outcome as a dot: filled = scored, hollow = saved, dim = to come. */
function Dots({ results }: { results: (boolean | null)[] }) {
  return (
    <div className="flex gap-1.5">
      {results.map((r, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ring-1 ${
            r === true
              ? "bg-emerald-400 ring-emerald-200"
              : r === false
                ? "bg-transparent ring-red-400"
                : "bg-white/10 ring-white/25"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * The penalty shootout HUD. You pick a direction on every kick — where to shoot
 * when it's your turn, and which way to dive when you're keeping goal.
 */
export function ShootoutOverlay() {
  const phase = useGameStore((s) => s.phase);
  const so = useGameStore((s) => s.shootout);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  const penaltyChoice = useGameStore((s) => s.penaltyChoice);

  if (phase !== "shootout" || !so) return null;

  const shooting = so.turn === "home";
  const homeGoals = shootoutGoals(so, "home");
  const awayGoals = shootoutGoals(so, "away");

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between font-sans text-white">
      {/* Tally */}
      <div className="mx-auto mt-3 w-[min(94vw,460px)] rounded-xl bg-neutral-950/85 p-3 ring-1 ring-white/10 backdrop-blur-md">
        <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
          {so.suddenDeath ? "Sudden death" : "Penalty shootout"}
        </div>
        <Row
          teamId={home.id}
          short={home.short}
          goals={homeGoals}
          results={so.results.home}
          active={so.turn === "home"}
        />
        <div className="h-1.5" />
        <Row
          teamId={away.id}
          short={away.short}
          goals={awayGoals}
          results={so.results.away}
          active={so.turn === "away"}
        />
      </div>

      {/* Prompt + buttons */}
      <div className="mx-auto mb-8 w-[min(94vw,460px)] text-center">
        {so.stage === "choosing" && (
          <>
            <div className="mb-1 text-lg font-black tracking-wide drop-shadow">
              {shooting ? "Where do you shoot?" : "Which way do you dive?"}
            </div>
            <div className="mb-3 text-xs text-white/60">
              {shooting
                ? `${home.short} to take · kick ${so.round + 1}`
                : `${away.short} to take · you're in goal`}
            </div>
            <div className="pointer-events-auto flex justify-center gap-3">
              {DIRECTIONS.map(({ dir, label, Icon }) => (
                <button
                  key={dir}
                  onClick={() => penaltyChoice(dir)}
                  className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl text-base font-black shadow-xl ring-2 transition active:scale-90 ${
                    shooting
                      ? "bg-red-500/85 ring-white/40 hover:bg-red-400"
                      : "bg-sky-500/85 ring-white/40 hover:bg-sky-400"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {so.stage === "resolving" && (
          <div className="text-2xl font-black tracking-widest text-white/80">
            …
          </div>
        )}

        {so.stage === "result" && so.kick && (
          <div
            className={`text-4xl font-black tracking-tight drop-shadow ${
              so.kick.outcome === "goal" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {outcomeLabel(so.kick.outcome, shooting)}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  teamId,
  short,
  goals,
  results,
  active,
}: {
  teamId: string;
  short: string;
  goals: number;
  results: (boolean | null)[];
  active: boolean;
}) {
  // Always show at least the regulation five slots.
  const shown =
    results.length >= SHOOTOUT_KICKS
      ? results
      : [...results, ...Array<null>(SHOOTOUT_KICKS - results.length).fill(null)];
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
        active ? "bg-yellow-400/15 ring-1 ring-yellow-300/50" : ""
      }`}
    >
      <Flag id={teamId} width={22} />
      <span className="w-10 text-sm font-black">{short}</span>
      <span className="w-5 text-lg font-black tabular-nums">{goals}</span>
      <Dots results={shown} />
    </div>
  );
}
