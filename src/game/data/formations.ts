import type { PlayerPosition } from '@/game/state/types'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'

const HALF_W = FIELD_DIMENSIONS.width / 2
const HALF_L = FIELD_DIMENSIONS.length / 2

export interface FormationSlot {
  role: PlayerPosition
  isGoalkeeper: boolean
  /** Fraction of the half-width. -1 = left touchline, +1 = right touchline. */
  fx: number
  /** Fraction of the half-length. -1 = own goal line, +1 = opponent's. */
  fz: number
  /** Resolved metres, for a team that defends -Z. */
  x: number
  z: number
}

function slot(
  role: PlayerPosition,
  fx: number,
  fz: number,
  isGoalkeeper = false,
): FormationSlot {
  return { role, isGoalkeeper, fx, fz, x: fx * HALF_W, z: fz * HALF_L }
}

/**
 * How far up and back each role is allowed to roam, as fractions of the half
 * length (-1 = own goal line, +1 = opponent's), split by whether the team has
 * the ball.
 *
 * This is what actually makes a defender look like a defender: without a band,
 * every outfielder drifts toward the ball and the shape dissolves into a swarm.
 */
export interface RoleBand {
  /** Furthest forward this role goes while their team attacks. */
  attackMax: number
  /** Furthest back this role drops while their team attacks. */
  attackMin: number
  /** Furthest forward this role stays while defending. */
  defendMax: number
  /** Furthest back this role drops while defending. */
  defendMin: number
}

export const ROLE_BANDS: Record<PlayerPosition, RoleBand> = {
  // Keepers are handled entirely by their own behaviour; these are unused.
  GK: { attackMax: -0.8, attackMin: -1, defendMax: -0.8, defendMin: -1 },
  // Defenders push up to halfway at most, and drop onto their own box when
  // defending. They never join the attack.
  DEF: { attackMax: 0.02, attackMin: -0.75, defendMax: -0.25, defendMin: -0.92 },
  // Midfielders link the two: they cover the widest band of the pitch.
  MID: { attackMax: 0.62, attackMin: -0.45, defendMax: 0.2, defendMin: -0.7 },
  // Forwards stay high. They press the nearest defender but never track back.
  FWD: { attackMax: 0.94, attackMin: -0.1, defendMax: 0.72, defendMin: -0.35 },
}

/**
 * 8-a-side shape (GK + 3 DEF + 3 MID + 1 FWD), defined for a team that defends
 * the -Z goal. The away team mirrors these along Z.
 *
 * Positions are stored as FRACTIONS of the pitch, so resizing the pitch keeps
 * the shape proportional instead of silently squashing it.
 */
export const FORMATION: FormationSlot[] = [
  slot('GK', 0, -0.95, true),
  slot('DEF', -0.52, -0.62),
  slot('DEF', 0, -0.68),
  slot('DEF', 0.52, -0.62),
  slot('MID', -0.55, -0.2),
  slot('MID', 0, -0.28),
  slot('MID', 0.55, -0.2),
  slot('FWD', 0, 0.12),
]

/** How many players each side puts on the pitch. */
export const SQUAD_SIZE = FORMATION.length

// Home defends +Z (the goal nearest the camera) and attacks -Z; away mirrors.
/** Home home-position for a slot (defends +Z, near camera). */
export function homePosition(slot: FormationSlot): [number, number, number] {
  return [slot.x, 1, -slot.z]
}

/** Away home-position mirrors: defends -Z, attacks +Z. */
export function awayPosition(slot: FormationSlot): [number, number, number] {
  return [-slot.x, 1, slot.z]
}
