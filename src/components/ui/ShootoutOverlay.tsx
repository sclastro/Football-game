import { useEffect, useRef, useState } from "react";
import { useGameStore, SHOOTOUT_KICKS, shootoutGoals } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";
import { Flag } from "./Flag";
import {
  GOAL_HEIGHT,
  HALF_GOAL_W,
  SHOT_CIRCLE_RADIUS,
  coverRadius,
} from "@/game/systems/penaltySystem";
import { projectToScreen } from "@/game/systems/playerPicking";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import type { PenaltyKick, PenaltyOutcome } from "@/game/state/types";

const HALF_L = FIELD_DIMENSIONS.length / 2;

/** What to shout when a kick resolves, from the user's point of view. */
function outcomeLabel(
  outcome: PenaltyOutcome,
  userWasShooting: boolean,
): string {
  switch (outcome) {
    case "goal":
      return userWasShooting ? "GOAL!" : "THEY SCORED";
    case "post":
      return "OFF THE POST!";
    case "wide":
      return userWasShooting ? "MISSED!" : "THEY MISSED!";
    case "saved":
      return userWasShooting ? "SAVED!" : "SAVED BY YOU!";
  }
}

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

interface GoalRect {
  /** Viewport pixels of the goal mouth's four corners. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the goal mouth actually is on screen.
 *
 * The camera sits behind the goal and settles over a few frames, so this
 * re-projects the frame's corners on an animation frame rather than assuming a
 * fixed position — which is what lets the aiming circles sit exactly on the real
 * goal instead of over a guess at it.
 */
function useGoalRect(taker: "home" | "away", live: boolean): GoalRect | null {
  const [rect, setRect] = useState<GoalRect | null>(null);
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const attackSign = taker === "home" ? -1 : 1;
    const goalZ = attackSign * HALF_L;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const a = projectToScreen(-HALF_GOAL_W, GOAL_HEIGHT, goalZ);
      const b = projectToScreen(HALF_GOAL_W, 0, goalZ);
      if (!a || !b) return;
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y, b.y);
      setRect({ left, top, width: right - left, height: bottom - top });
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [taker, live]);
  return rect;
}

/**
 * The penalty shootout HUD.
 *
 * Both roles are the same gesture: drag a circle to a point in the goal and let
 * go. The shooter's circle is small — it is a target, and the corners are the
 * only places the keeper cannot reach, which are also the only places you can
 * miss from. The keeper's circle is much bigger, and a save is simply the two
 * overlapping.
 */
export function ShootoutOverlay() {
  const phase = useGameStore((s) => s.phase);
  const so = useGameStore((s) => s.shootout);
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  const difficulty = useGameStore((s) => s.difficulty);
  const penaltyAim = useGameStore((s) => s.penaltyAim);

  const live = phase === "shootout" && !!so;
  const goal = useGoalRect(so?.turn ?? "home", live);

  if (!live || !so) return null;

  const shooting = so.turn === "home";
  const homeGoals = shootoutGoals(so, "home");
  const awayGoals = shootoutGoals(so, "away");
  // In screen metres — positive is right as you look at the goal. The scene
  // converts to world X, so neither end of the pitch reads backwards.
  //
  // The keeper's circle is drawn at its REAL size for wherever it currently
  // sits, so dragging toward a corner visibly shrinks it. That is the whole
  // trade-off made legible: you can reach the corner, but barely.
  const radiusFor = (x: number, y: number) =>
    shooting ? SHOT_CIRCLE_RADIUS : coverRadius(difficulty, x, y);

  return (
    <div className="pointer-events-none absolute inset-0 font-sans text-white">
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

      {goal && so.stage === "choosing" && (
        <AimPad
          goal={goal}
          radiusFor={radiusFor}
          shooting={shooting}
          onCommit={(x, y) => penaltyAim(x, y)}
        />
      )}

      {goal && so.stage !== "choosing" && so.kick && (
        <ResultMarkers goal={goal} kick={so.kick} />
      )}

      <div className="absolute inset-x-0 bottom-0 mx-auto mb-6 w-[min(94vw,520px)] text-center">
        {so.stage === "choosing" && (
          <>
            <div className="text-lg font-black tracking-wide drop-shadow">
              {shooting ? "Drag your target into the goal" : "Drag your reach across the goal"}
            </div>
            <div className="mt-1 text-xs text-white/60">
              {shooting
                ? `${home.short} to take · kick ${so.round + 1} · the corners are unreachable, and the easiest place to miss`
                : `${away.short} to take · you're in goal · overlap the ball and it's yours`}
            </div>
          </>
        )}

        {so.stage === "resolving" && (
          <div className="text-2xl font-black tracking-widest text-white/70">…</div>
        )}

        {so.stage === "result" && so.kick && (
          <div
            className={`text-4xl font-black tracking-tight drop-shadow ${
              so.kick.outcome === "goal"
                ? shooting
                  ? "text-emerald-400"
                  : "text-red-400"
                : shooting
                  ? "text-red-400"
                  : "text-emerald-400"
            }`}
          >
            {outcomeLabel(so.kick.outcome, shooting)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Convert goal-mouth metres to a position inside the projected goal rect. */
function toPx(goal: GoalRect, x: number, y: number) {
  return {
    left: goal.left + ((x + HALF_GOAL_W) / (HALF_GOAL_W * 2)) * goal.width,
    top: goal.top + (1 - y / GOAL_HEIGHT) * goal.height,
  };
}

/** Metres per pixel across the goal, used to size the circles and read drags. */
function metresPerPx(goal: GoalRect): number {
  return (HALF_GOAL_W * 2) / Math.max(1, goal.width);
}

interface AimPadProps {
  goal: GoalRect;
  /** Circle radius in metres for a given point — the keeper's shrinks at full stretch. */
  radiusFor: (x: number, y: number) => number;
  shooting: boolean;
  onCommit: (x: number, y: number) => void;
}

/**
 * The draggable circle. It covers the whole screen so the drag can start
 * anywhere, but the circle itself is clamped to a little outside the frame —
 * you are allowed to aim at the post, and to aim just past it.
 */
function AimPad({ goal, radiusFor, shooting, onCommit }: AimPadProps) {
  const scale = metresPerPx(goal);
  const [aim, setAim] = useState({ x: 0, y: GOAL_HEIGHT * 0.45 });
  const dragging = useRef(false);

  const readPoint = (clientX: number, clientY: number) => {
    const x = ((clientX - goal.left) / Math.max(1, goal.width)) * (HALF_GOAL_W * 2) - HALF_GOAL_W;
    const y = (1 - (clientY - goal.top) / Math.max(1, goal.height)) * GOAL_HEIGHT;
    return {
      x: Math.max(-HALF_GOAL_W - 0.5, Math.min(HALF_GOAL_W + 0.5, x)),
      y: Math.max(0.12, Math.min(GOAL_HEIGHT + 0.5, y)),
    };
  };

  const pos = toPx(goal, aim.x, aim.y);
  const px = radiusFor(aim.x, aim.y) / scale;

  return (
    <div
      className="pointer-events-auto absolute inset-0 touch-none"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setAim(readPoint(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => {
        if (dragging.current) setAim(readPoint(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        const p = readPoint(e.clientX, e.clientY);
        onCommit(p.x, p.y);
      }}
    >
      {/* The goal mouth itself, so it is obvious what you are aiming into. */}
      <div
        className="pointer-events-none absolute rounded-sm ring-2 ring-white/45"
        style={{
          left: goal.left,
          top: goal.top,
          width: goal.width,
          height: goal.height,
        }}
      />
      <div
        className={`pointer-events-none absolute rounded-full ${
          shooting
            ? "bg-amber-300/35 ring-[3px] ring-amber-200"
            : "bg-sky-400/25 ring-[3px] ring-sky-200"
        }`}
        style={{
          left: pos.left - px,
          top: pos.top - px,
          width: px * 2,
          height: px * 2,
        }}
      >
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>
    </div>
  );
}

/** After the kick: show where the ball went and where the keeper reached. */
function ResultMarkers({ goal, kick }: { goal: GoalRect; kick: PenaltyKick }) {
  const scale = metresPerPx(goal);
  const keeper = toPx(goal, kick.diveX, kick.diveY);
  const ball = toPx(goal, kick.shotX, kick.shotY);
  // The reach that actually applied, measured where the ball ended up — so the
  // circle you see afterwards is the one the save was judged against.
  const kpx = kick.diveRadius / scale;
  return (
    <>
      <div
        className="pointer-events-none absolute rounded-full bg-sky-400/20 ring-2 ring-sky-300/70"
        style={{
          left: keeper.left - kpx,
          top: keeper.top - kpx,
          width: kpx * 2,
          height: kpx * 2,
        }}
      />
      <div
        className="pointer-events-none absolute h-4 w-4 rounded-full bg-white ring-2 ring-neutral-900"
        style={{ left: ball.left - 8, top: ball.top - 8 }}
      />
    </>
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
