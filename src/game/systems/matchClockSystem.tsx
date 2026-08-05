import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import {
  ballApi,
  clearPass,
  dribbleState,
  playerRegistry,
  type PlayerRecord,
  type TeamSide,
} from "./worldRegistry";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import { GOAL_DIMENSIONS } from "@/game/entities/Goal";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { isPlayingPhase } from "@/game/state/types";
import { audio } from "./audio";

const HALF_W = FIELD_DIMENSIONS.width / 2;
const LINE_Z = FIELD_DIMENSIONS.length / 2;
const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2;
const GOAL_H = GOAL_DIMENSIONS.height;
const BALL_R = PHYSICS_CONFIG.ball.radius;
/** How close to a post a passing ball has to be to ring the woodwork. */
const POST_RING_DIST = 0.45;
/** A shot passing within this of the goal mouth draws an "oooh". */
const NEAR_MISS_X = 2.5;

/** Debounce so one ball rattling near a post doesn't machine-gun the sound. */
const woodwork = { lastAt: 0 };

/**
 * Play the crowd reaction for a ball flying at, or narrowly past, a goal.
 * Called only while the ball is near a goal line and travelling toward it.
 */
function reactToNearGoal(x: number, y: number, insideMouth: boolean): void {
  const now = performance.now() / 1000;
  if (now - woodwork.lastAt < 0.8) return;

  const distToPost = Math.abs(Math.abs(x) - HALF_GOAL_W);
  if (distToPost < POST_RING_DIST && y < GOAL_H + 0.4) {
    woodwork.lastAt = now;
    audio.post();
    return;
  }
  if (!insideMouth && Math.abs(x) < HALF_GOAL_W + NEAR_MISS_X && y < GOAL_H + 2) {
    woodwork.lastAt = now;
    audio.nearMiss();
  }
}

/** How far inside the line the ball is placed for a restart. */
const RESTART_INSET = 1.5;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Quick throw-in / goal kick. The ball is brought back just inside the line at
 * the point it left, and the nearest player from the side that did NOT put it
 * out is moved beside it to take the restart. Everyone else stays where they
 * are — a full kickoff reset every time the ball went out made the match feel
 * like it never got going.
 */
function restartFromTouch(outX: number, outZ: number): void {
  const body = ballApi.body;
  if (!body) return;

  const x = clamp(outX, -HALF_W + RESTART_INSET, HALF_W - RESTART_INSET);
  const z = clamp(outZ, -LINE_Z + RESTART_INSET, LINE_Z - RESTART_INSET);

  body.setTranslation({ x, y: BALL_R + 0.05, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);

  // Award possession to the other side.
  const awardTo: TeamSide =
    dribbleState.lastTouchTeam === "home" ? "away" : "home";
  let taker: PlayerRecord | null = null;
  let bestD = Infinity;
  for (const rec of playerRegistry.values()) {
    if (rec.team !== awardTo || rec.isGoalkeeper) continue;
    const d = Math.hypot(rec.position.x - x, rec.position.z - z);
    if (d < bestD) {
      bestD = d;
      taker = rec;
    }
  }
  if (taker?.rigidBody) {
    // Stand them a stride off the ball, nudged toward the middle of the pitch.
    const inward = x > 0 ? -1 : 1;
    const tx = clamp(x + inward * 1.1, -HALF_W + 0.5, HALF_W - 0.5);
    taker.rigidBody.setTranslation({ x: tx, y: 1, z }, true);
    taker.position.set(tx, 1, z);
  }

  // The restart is a fresh touch, and any pass that was in flight is dead.
  dribbleState.lastTouchTeam = awardTo;
  dribbleState.protectedUntil = performance.now() / 1000 + 0.6;
  clearPass();
}

/**
 * Drives match flow from the render loop:
 * - ticks the countdown while the ball is in play (regulation or extra time);
 * - goal detection by ball position: only counts once the WHOLE ball has
 *   crossed the goal line between the posts, under the bar;
 * - real out-of-play: the moment the whole ball crosses a touchline or the
 *   goal line outside the goal, the ball returns to the centre spot and both
 *   teams reset to formation (a fresh kickoff);
 * - resumes play after the GOAL! stoppage;
 * - runs the entrance countdown and the shootout timeline.
 */
export function MatchClock() {
  useFrame((_, delta) => {
    const state = useGameStore.getState();

    if (state.phase === "entrance") {
      // The kickoff whistle is played by the AudioController on entering
      // 'live', so it fires whether the entrance ran out or was skipped.
      if (performance.now() / 1000 >= state.entranceUntil) state.beginPlay();
      return;
    }

    if (state.phase === "shootout") {
      state.tickShootout();
      return;
    }

    if (isPlayingPhase(state.phase)) {
      state.tickClock(delta);

      const body = ballApi.body;
      if (!body) return;
      const t = body.translation();

      const withinGoalMouth = Math.abs(t.x) < HALF_GOAL_W && t.y < GOAL_H;

      // Crowd reaction as the ball arrives at either goal line.
      if (Math.abs(t.z) > LINE_Z - 1.2) {
        reactToNearGoal(t.x, t.y, withinGoalMouth);
      }

      // Home attacks -Z; a ball fully across the -Z line is a HOME goal.
      if (withinGoalMouth && t.z < -(LINE_Z + BALL_R)) {
        state.scoreGoal("home");
        return;
      }
      if (withinGoalMouth && t.z > LINE_Z + BALL_R) {
        state.scoreGoal("away");
        return;
      }

      // Out of play: whole ball across a touchline, or across a goal line
      // outside the goal mouth. Restart as a quick throw-in — the ball comes
      // back just inside the line and the nearest opponent of whoever put it
      // out steps up to it. Nobody else moves, so play never actually stops.
      const overTouchline = Math.abs(t.x) > HALF_W + BALL_R;
      const overGoalLine = Math.abs(t.z) > LINE_Z + BALL_R && !withinGoalMouth;
      if (overTouchline || overGoalLine || t.y < -2) {
        restartFromTouch(t.x, t.z);
        audio.whistle();
      }
    } else if (state.phase === "goalStoppage") {
      if (performance.now() / 1000 >= state.goalFlashUntil) {
        state.restartAfterGoal();
      }
    }
  });

  return null;
}
