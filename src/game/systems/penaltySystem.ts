import type { PenaltyKick } from '@/game/state/types'
import { DIFFICULTY, type Difficulty } from '@/game/data/difficulty'
import { GOAL_DIMENSIONS } from '@/game/entities/Goal'

export const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2
export const GOAL_HEIGHT = GOAL_DIMENSIONS.height

/**
 * Radius of the shooter's aiming circle, in metres. It is deliberately small:
 * it is a target, not a margin for error, and it is what the ball is scattered
 * around.
 */
export const SHOT_CIRCLE_RADIUS = 0.42

/**
 * Radius of the keeper's reach circle, by difficulty. Roughly a third of the
 * goal width on Normal, so guessing the right half is not automatically a save
 * and the corners are genuinely out of reach.
 */
const KEEPER_RADIUS: Record<Difficulty, number> = {
  easy: 0.95,
  normal: 1.25,
  hard: 1.6,
}

export function keeperRadius(difficulty: Difficulty): number {
  return KEEPER_RADIUS[difficulty]
}

/**
 * How much of the keeper's reach is lost at full stretch.
 *
 * Without this the mechanic has no shape: a circle of fixed size covers the top
 * corner exactly as well as it covers the middle, so aiming for a corner is all
 * risk and no reward. A keeper who has to leave the ground reaches less, which
 * is what makes the corner worth the miss chance.
 */
const STRETCH_PENALTY = 0.55

/** How close to the frame a missed shot has to be to have clipped it. */
const WOODWORK_BAND = 0.08

/** 0 at the bottom centre of the goal, 1 at a corner. */
function stretchAt(x: number, y: number): number {
  return Math.min(1, Math.hypot(x / HALF_GOAL_W, y / GOAL_HEIGHT))
}

/** The keeper's effective reach for a ball at this point in the goal. */
export function coverRadius(difficulty: Difficulty, x: number, y: number): number {
  return (
    KEEPER_RADIUS[difficulty] * (1 - STRETCH_PENALTY * stretchAt(x, y)) +
    SHOT_CIRCLE_RADIUS
  )
}

/**
 * How far the ball strays from where it was aimed, in metres.
 *
 * The scatter grows the closer the aim is to the frame, which is the whole
 * tension of the mechanic: the corner is the only place the keeper cannot
 * reach, and it is also the only place you can miss from.
 */
function scatterFor(aimX: number, aimY: number): number {
  const edgeX = Math.abs(aimX) / HALF_GOAL_W
  const edgeY = Math.max(0, aimY - GOAL_HEIGHT * 0.45) / (GOAL_HEIGHT * 0.55)
  const edge = Math.max(edgeX, edgeY)
  return 0.11 + edge * edge * 0.36
}

function gauss(): number {
  // Box-Muller, clamped — a long tail here would produce absurd misses.
  const u = Math.max(1e-6, Math.random())
  const v = Math.random()
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(-2.2, Math.min(2.2, n))
}

/** Clamp an aim point to somewhere a taker could plausibly be aiming. */
export function clampAim(x: number, y: number): { x: number; y: number } {
  const margin = 0.55
  return {
    x: Math.max(-HALF_GOAL_W - margin, Math.min(HALF_GOAL_W + margin, x)),
    y: Math.max(0.12, Math.min(GOAL_HEIGHT + margin, y)),
  }
}

/**
 * Resolve one penalty from two points on the goal mouth.
 *
 * Order matters: the ball is scattered off the aim FIRST, then checked against
 * the frame, then against the keeper's reach. That is why a keeper can guess
 * perfectly and still concede (the ball went somewhere neither of you planned)
 * and why a taker can pick an unreachable corner and put it on the roof.
 */
export function resolvePenalty(
  aimX: number,
  aimY: number,
  diveX: number,
  diveY: number,
  difficulty: Difficulty,
  /** True when the AI is taking; AI takers aim a shade less bravely. */
  aiTaker: boolean,
): PenaltyKick {
  const aim = clampAim(aimX, aimY)
  const spread = scatterFor(aim.x, aim.y) * (aiTaker ? 1.1 : 1)
  const shotX = aim.x + gauss() * spread
  const shotY = aim.y + gauss() * spread * 0.8

  const distance = Math.hypot(shotX - diveX, shotY - diveY)
  // The keeper needs to cover the ball, not merely be near it; the shot circle
  // counts as part of the ball's spread, which is the "overlap" rule. Reach
  // falls away toward the corners, so the same dive covers less up there.
  const cover = coverRadius(difficulty, shotX, shotY)
  const missBy = Math.max(0, Math.min(1, (distance - cover) / cover))

  const insideX = Math.abs(shotX) <= HALF_GOAL_W
  const insideY = shotY <= GOAL_HEIGHT && shotY > 0

  let outcome: PenaltyKick['outcome']
  if (!insideX || !insideY) {
    // Close enough to the frame to have clipped it instead of sailing past.
    const grazeX = Math.abs(Math.abs(shotX) - HALF_GOAL_W) < WOODWORK_BAND
    const grazeY = Math.abs(shotY - GOAL_HEIGHT) < WOODWORK_BAND
    outcome = grazeX || grazeY ? 'post' : 'wide'
  } else if (distance < cover) {
    outcome = 'saved'
  } else {
    outcome = 'goal'
  }

  return {
    aimX: aim.x,
    aimY: aim.y,
    shotX,
    shotY,
    diveX,
    diveY,
    // Record the reach that actually applied, not the nominal one, so the
    // replay circle matches the decision that was made.
    diveRadius: cover,
    missBy,
    outcome,
  }
}

/**
 * Where the AI puts its circle when it is taking.
 *
 * Braver on higher difficulty, but never perfectly into the top corner —
 * an AI that always aimed at the unreachable spot would be unbeatable and dull.
 */
export function aiPenaltyAim(difficulty: Difficulty): { x: number; y: number } {
  const tune = DIFFICULTY[difficulty]
  const bravery = 0.45 + tune.gkAnticipation * 0.4
  const side = Math.random() < 0.5 ? -1 : 1
  // Every so often they go straight down the middle, which beats a diving keeper.
  const centre = Math.random() < 0.16
  const x = centre ? (Math.random() - 0.5) * 1.2 : side * HALF_GOAL_W * (0.45 + Math.random() * bravery * 0.6)
  const y = 0.25 + Math.random() * GOAL_HEIGHT * (0.35 + bravery * 0.4)
  return clampAim(x, y)
}

/**
 * Where the AI keeper puts its circle. It reads the taker's body rather than
 * the ball, so on lower difficulty it is often committed to the wrong half.
 */
export function aiPenaltyDive(
  difficulty: Difficulty,
  /** The point the human aimed at, if the AI is keeping against a human. */
  aim?: { x: number; y: number },
): { x: number; y: number } {
  const tune = DIFFICULTY[difficulty]
  // Only sometimes does the keeper read the taker at all, and even then never
  // exactly. The error floor matters: without it a hard keeper would land
  // within a few centimetres of wherever you aimed and nothing would go in.
  if (aim && Math.random() < tune.gkAnticipation * 0.55) {
    const error = 2.0 + (1 - tune.gkAnticipation) * 4.0
    return {
      x: aim.x + (Math.random() - 0.5) * error,
      y: Math.max(0.3, aim.y + (Math.random() - 0.5) * error * 0.5),
    }
  }
  // Pure guess. Anywhere across the goal, biased toward the lower half, which
  // is where keepers actually dive.
  return {
    x: (Math.random() * 2 - 1) * HALF_GOAL_W * 0.95,
    y: 0.25 + Math.pow(Math.random(), 1.6) * GOAL_HEIGHT * 0.78,
  }
}

/** Short human-readable result, for the shootout overlay. */
export function outcomeLabel(kick: PenaltyKick): string {
  switch (kick.outcome) {
    case 'goal':
      return kick.missBy > 0.55 ? 'UNSTOPPABLE' : 'SCORED'
    case 'saved':
      return 'SAVED'
    case 'post':
      return 'OFF THE WOODWORK'
    default:
      return Math.abs(kick.shotX) > HALF_GOAL_W ? 'DRAGGED WIDE' : 'OVER THE BAR'
  }
}
