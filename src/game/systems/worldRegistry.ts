import * as THREE from 'three'
import type { RapierRigidBody } from '@react-three/rapier'

export type TeamSide = 'home' | 'away'

export interface AiState {
  /** Fraction of top speed this AI player runs at. */
  speed: number
  /** Wandering offset added to the AI's target, refreshed periodically. */
  jitterX: number
  jitterZ: number
  nextJitterAt: number
  /** The AI won't react to a new loose ball until this time (reaction delay). */
  reactUntil: number
}

export interface PlayerRecord {
  id: string
  team: TeamSide
  isGoalkeeper: boolean
  /** Live world position, updated every frame by the entity. */
  position: THREE.Vector3
  spawn: [number, number, number]
  rigidBody: RapierRigidBody | null
  ai: AiState
}

/**
 * Module-level registry of live match objects. Entities register themselves on
 * mount and update their position refs each frame, so AI/camera/rules systems
 * can read world state without React re-renders.
 */
export const playerRegistry = new Map<string, PlayerRecord>()

export const ballApi: { body: RapierRigidBody | null } = { body: null }

/**
 * In-flight pass being tracked for auto-switch: when the ball reaches the
 * receiver, control jumps to them. Cleared on connect, expiry, or reset.
 */
export const passState: { receiverId: string | null; expiresAt: number } = {
  receiverId: null,
  expiresAt: 0,
}

export function ballPosition(out = new THREE.Vector3()): THREE.Vector3 | null {
  const body = ballApi.body
  if (!body) return null
  const t = body.translation()
  return out.set(t.x, t.y, t.z)
}

/** Nearest outfield player of a team to the ball (for control switching). */
export function nearestOutfieldToBall(team: TeamSide): PlayerRecord | null {
  const ball = ballPosition()
  if (!ball) return null
  let best: PlayerRecord | null = null
  let bestDist = Infinity
  for (const rec of playerRegistry.values()) {
    if (rec.team !== team || rec.isGoalkeeper) continue
    const d = rec.position.distanceToSquared(ball)
    if (d < bestDist) {
      bestDist = d
      best = rec
    }
  }
  return best
}

const _scratch = new THREE.Vector3()

/** Is this player the closest member of their team to the ball? */
export function isClosestTeammateToBall(id: string): boolean {
  const self = playerRegistry.get(id)
  const ball = ballPosition(_scratch)
  if (!self || !ball) return false
  const own = self.position.distanceToSquared(ball)
  for (const rec of playerRegistry.values()) {
    if (rec.team !== self.team || rec.id === id || rec.isGoalkeeper) continue
    if (rec.position.distanceToSquared(ball) < own) return false
  }
  return true
}
