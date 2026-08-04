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
  /** Set while this player is the user's selected teammate: break into space. */
  makeRun: boolean
  /** Cached SupportRun destination, refreshed on a timer to avoid dithering. */
  runX: number
  runZ: number
  nextRunAt: number
}

export interface PlayerRecord {
  id: string
  team: TeamSide
  isGoalkeeper: boolean
  /** Live world position, updated every frame by the entity. */
  position: THREE.Vector3
  /** Live facing yaw (radians), updated every frame by the entity. */
  yaw: number
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
 * Ball-carry state. `possessorId` is whoever currently controls the ball at
 * their feet; `releaseUntil` briefly disables the carry after a kick so the
 * ball actually leaves.
 */
export const dribbleState: { possessorId: string | null; releaseUntil: number } = {
  possessorId: null,
  releaseUntil: 0,
}

/**
 * A pass currently travelling between two players. Control transfers to
 * `targetId` when it arrives; an opponent reaching the ball first is an
 * interception and control stays with the passer.
 */
export const passState: {
  active: boolean
  /** True only for a pass played by the human-controlled player. */
  byUser: boolean
  fromId: string | null
  targetId: string | null
  /** Perf-clock seconds after which an unreceived pass is considered dead. */
  expiresAt: number
  /** Where the pass was struck from, for interception lane maths. */
  origin: THREE.Vector3
  /** Where the receiver was standing when it was struck. */
  target: THREE.Vector3
} = {
  active: false,
  byUser: false,
  fromId: null,
  targetId: null,
  expiresAt: 0,
  origin: new THREE.Vector3(),
  target: new THREE.Vector3(),
}

export function clearPass(): void {
  passState.active = false
  passState.byUser = false
  passState.fromId = null
  passState.targetId = null
  passState.expiresAt = 0
}

/** Nearest player of any team to the ball within `radius`, optionally incl. GK. */
export function nearestPlayerToBall(
  radius: number,
  includeGk = true,
): PlayerRecord | null {
  const ball = ballPosition(_scratch)
  if (!ball) return null
  let best: PlayerRecord | null = null
  let bestDist = radius * radius
  for (const rec of playerRegistry.values()) {
    if (!includeGk && rec.isGoalkeeper) continue
    const d = rec.position.distanceToSquared(ball)
    if (d < bestDist) {
      bestDist = d
      best = rec
    }
  }
  return best
}

export function ballPosition(out = new THREE.Vector3()): THREE.Vector3 | null {
  const body = ballApi.body
  if (!body) return null
  const t = body.translation()
  return out.set(t.x, t.y, t.z)
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
