import type { PlayerPosition } from '@/game/state/types'

export interface FormationSlot {
  role: PlayerPosition
  isGoalkeeper: boolean
  /** Home-orientation position (team defends -Z, attacks +Z). x = width, z = length. */
  x: number
  z: number
}

/**
 * A compact 6-a-side shape (GK + 2 DEF + 2 MID + 1 FWD), defined for a team
 * that defends the -Z goal. The away team mirrors these along Z.
 */
export const FORMATION: FormationSlot[] = [
  { role: 'GK', isGoalkeeper: true, x: 0, z: -26 },
  { role: 'DEF', isGoalkeeper: false, x: -8, z: -16 },
  { role: 'DEF', isGoalkeeper: false, x: 8, z: -16 },
  { role: 'MID', isGoalkeeper: false, x: -7, z: -4 },
  { role: 'MID', isGoalkeeper: false, x: 7, z: -4 },
  { role: 'FWD', isGoalkeeper: false, x: 0, z: 6 },
]

// Home defends +Z (the goal nearest the camera) and attacks -Z; away mirrors.
/** Home home-position for a slot (defends +Z, near camera). */
export function homePosition(slot: FormationSlot): [number, number, number] {
  return [slot.x, 1, -slot.z]
}

/** Away home-position mirrors: defends -Z, attacks +Z. */
export function awayPosition(slot: FormationSlot): [number, number, number] {
  return [-slot.x, 1, slot.z]
}
