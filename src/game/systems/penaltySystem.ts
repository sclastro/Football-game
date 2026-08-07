import type {
  PenaltyDirection,
  PenaltyHeight,
  PenaltyKick,
} from '@/game/state/types'
import { DIFFICULTY, type Difficulty } from '@/game/data/difficulty'
import { GOAL_DIMENSIONS } from '@/game/entities/Goal'

export const DIRECTIONS: PenaltyDirection[] = ['left', 'centre', 'right']
const HEIGHTS: PenaltyHeight[] = ['low', 'mid', 'high']

const HALF_GOAL_W = GOAL_DIMENSIONS.width / 2
const GOAL_HEIGHT = GOAL_DIMENSIONS.height

/** Fraction of the half-goal-width each direction aims at. */
const DIR_OFFSET: Record<PenaltyDirection, number> = {
  left: -0.72,
  centre: 0,
  right: 0.72,
}

/** Height of each placement, in metres above the ground. */
const HEIGHT_Y: Record<PenaltyHeight, number> = {
  low: 0.35,
  mid: 1.1,
  high: 2.0,
}

/**
 * How hard each placement is for a keeper who guessed the right way.
 *
 * A low ball to the corner is the classic save; a high one into the top corner
 * beats almost anyone even when they dive correctly. This is what stops a
 * correct guess being an automatic save, which is what made the old shootout
 * completely predictable.
 */
const HEIGHT_SAVEABILITY: Record<PenaltyHeight, number> = {
  low: 0.92,
  mid: 0.7,
  high: 0.4,
}

/** A centre-height shot down the middle is easy if the keeper stays put. */
const CENTRE_SAVEABILITY = 0.85

/** Chance the taker's placement goes badly wrong, by height. */
const MISS_CHANCE: Record<PenaltyHeight, number> = {
  low: 0.03,
  mid: 0.05,
  high: 0.14,
}

function pickFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** Where in the goal mouth a placement is aimed, in metres. */
export function targetPoint(
  dir: PenaltyDirection,
  height: PenaltyHeight,
): { x: number; y: number } {
  return {
    x: DIR_OFFSET[dir] * (GOAL_DIMENSIONS.width / 2),
    y: HEIGHT_Y[height],
  }
}

/**
 * Resolve one penalty.
 *
 * Both sides commit blind: the taker picks a direction, the keeper picks a
 * direction, and then everything else is rolled. A keeper who guesses right
 * usually saves but can be beaten by placement; a taker who picks a corner can
 * put it wide or over all on their own. That uncertainty is the whole point —
 * "same direction = saved" made every kick a coin flip you could see coming.
 */
export function resolvePenalty(
  shotDir: PenaltyDirection,
  diveDir: PenaltyDirection,
  difficulty: Difficulty,
  /** True when the AI is taking; AI takers aim a little less bravely. */
  aiTaker: boolean,
): PenaltyKick {
  const tune = DIFFICULTY[difficulty]

  // Height is always the taker's nerve, never a menu choice — it's what makes
  // the same button press produce a different kick each time.
  const shotHeight: PenaltyHeight = aiTaker
    ? pickFrom<PenaltyHeight>(['low', 'low', 'mid', 'mid', 'high'])
    : pickFrom(HEIGHTS)

  // How well the keeper read it. Anticipation raises the average and narrows
  // the spread, so a hard keeper is late far less often.
  const diveTiming = Math.min(
    1,
    tune.gkAnticipation * 0.6 + Math.random() * (1 - tune.gkAnticipation * 0.4),
  )

  let aimErrorX = 0
  let aimErrorY = 0

  // 1. Did the taker miss the target entirely?
  //
  // The errors below have to be big enough to actually clear the frame — an
  // aim error that still lands between the posts would be reported as a miss
  // while the ball visibly goes in.
  const missChance = MISS_CHANCE[shotHeight] * (aiTaker ? 1.15 : 1)
  if (Math.random() < missChance) {
    const aimed = targetPoint(shotDir, shotHeight)
    // A shot down the middle can only ever be skied, never dragged wide.
    const overBar = shotDir === 'centre' || Math.random() < 0.45
    if (overBar) {
      // Clear the crossbar by a visible margin.
      aimErrorY = GOAL_HEIGHT - aimed.y + 0.35 + Math.random() * 0.6
      aimErrorX = (Math.random() - 0.5) * 1.6
    } else {
      // Dragged wide, always further out than the post they aimed inside of.
      const outward = shotDir === 'left' ? -1 : 1
      const clearance = HALF_GOAL_W - Math.abs(aimed.x) + 0.5
      aimErrorX = outward * (clearance + Math.random() * 1.1)
    }
    return {
      shotDir,
      shotHeight,
      diveDir,
      diveTiming,
      outcome: 'wide',
      aimErrorX,
      aimErrorY,
    }
  }

  // 2. Clipped the woodwork — rare, and always dramatic. Only a shot aimed at a
  // corner can find the upright.
  if (shotDir !== 'centre' && Math.random() < 0.06) {
    return {
      shotDir,
      shotHeight,
      diveDir,
      diveTiming,
      outcome: 'post',
      aimErrorX: 0,
      aimErrorY: 0,
    }
  }

  // 3. On target: can the keeper get to it?
  let saveChance: number
  if (diveDir === shotDir) {
    const base =
      shotDir === 'centre' ? CENTRE_SAVEABILITY : HEIGHT_SAVEABILITY[shotHeight]
    // Reach only matters once they've gone the right way.
    const reach = Math.min(1, tune.gkReach / 2.6)
    saveChance = base * (0.55 + diveTiming * 0.45) * reach
  } else if (shotDir === 'centre' || diveDir === 'centre') {
    // Adjacent guess: a keeper who stayed central can still stick out a boot,
    // and one who dived can trail a leg through the middle.
    saveChance = 0.14 * diveTiming * (tune.gkReach / 2.6)
  } else {
    // Dived completely the wrong way — only a freak stop.
    saveChance = 0.02
  }

  const outcome = Math.random() < saveChance ? 'saved' : 'goal'
  return {
    shotDir,
    shotHeight,
    diveDir,
    diveTiming,
    outcome,
    aimErrorX: (Math.random() - 0.5) * 0.35,
    aimErrorY: (Math.random() - 0.5) * 0.2,
  }
}

/** The AI's guess, with a slight lean toward the corners on higher difficulty. */
export function aiPenaltyChoice(difficulty: Difficulty): PenaltyDirection {
  const tune = DIFFICULTY[difficulty]
  // A sharper keeper/taker goes to a corner more often; a weaker one is happy
  // to pick the middle.
  if (Math.random() < 0.18 * (1 - tune.gkAnticipation * 0.5)) return 'centre'
  return Math.random() < 0.5 ? 'left' : 'right'
}
