export type Difficulty = 'easy' | 'normal' | 'hard'

export interface DifficultyTuning {
  /** Random reaction delay before an AI commits to a loose ball, in seconds. */
  reactionDelay: [number, number]
  /** Fraction of the human's top speed AI outfielders run at. */
  aiSpeedFactor: number
  /** How far a defender will step out to press the ball carrier. */
  pressRadius: number
  /** Perpendicular distance from a pass line within which a defender cuts in. */
  interceptRadius: number
  /** Aim scatter multiplier on AI kicks — higher is wilder. */
  shotScatter: number
  /** How far sideways the keeper can reach when diving. */
  gkReach: number
  /** Keeper dive speed multiplier. */
  gkDiveSpeed: number
  /** 0..1 chance the keeper reads a shot early rather than reacting late. */
  gkAnticipation: number
  /** 0..1 chance an AI carrier chooses a pass over dribbling on. */
  passTendency: number
}

export const DIFFICULTY: Record<Difficulty, DifficultyTuning> = {
  easy: {
    reactionDelay: [0.35, 0.8],
    aiSpeedFactor: 0.78,
    pressRadius: 7,
    interceptRadius: 1.6,
    shotScatter: 1.8,
    gkReach: 1.8,
    gkDiveSpeed: 0.75,
    gkAnticipation: 0.25,
    passTendency: 0.25,
  },
  normal: {
    reactionDelay: [0.18, 0.45],
    aiSpeedFactor: 0.9,
    pressRadius: 10,
    interceptRadius: 2.4,
    shotScatter: 1.0,
    gkReach: 2.6,
    gkDiveSpeed: 1.0,
    gkAnticipation: 0.55,
    passTendency: 0.4,
  },
  hard: {
    reactionDelay: [0.08, 0.22],
    aiSpeedFactor: 1.0,
    pressRadius: 14,
    interceptRadius: 3.2,
    shotScatter: 0.6,
    gkReach: 3.3,
    gkDiveSpeed: 1.25,
    gkAnticipation: 0.8,
    passTendency: 0.55,
  },
}

export const DIFFICULTY_IDS: Difficulty[] = ['easy', 'normal', 'hard']

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}
