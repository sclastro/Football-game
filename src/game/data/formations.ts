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
