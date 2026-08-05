import * as THREE from 'three'
import { useGameStore, ENTRANCE_DURATION } from '@/game/state/gameStore'
import { type PlayerRecord } from './worldRegistry'
import { steerToward } from './aiSystem'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'
import type { InputState } from './inputSystem'

const HALF_W = FIELD_DIMENSIONS.width / 2

/**
 * Entrance timeline, in seconds from the start of the walk-out:
 *   0.0 – 2.6  the teams file out from the touchline toward halfway
 *   2.6 – 5.0  they hold two lines while the camera sweeps across them
 *   5.0 – 7.0  they break for their kickoff positions
 */
export const ENTRANCE_WALK_END = 2.6
export const ENTRANCE_LINEUP_END = 5.0

const _target = new THREE.Vector3()

/** Seconds since the walk-out began. */
export function entranceElapsed(): number {
  const st = useGameStore.getState()
  return ENTRANCE_DURATION - (st.entranceUntil - performance.now() / 1000)
}

/**
 * Movement for one player during the walk-out. Uses exactly the same steering
 * and movement code as the match, so the normal walk cycle plays and nothing
 * needs hand-animating — the players simply have somewhere else to be.
 */
export function computeEntranceInput(
  rec: PlayerRecord,
  input: InputState,
  elapsed: number,
): InputState {
  input.sprinting = false
  input.shootHeld = false
  input.shootCharge = 0
  input.shootReleased = false
  input.passPressed = false
  input.hasShootAim = false
  input.moveDirection.set(0, 0)

  if (elapsed < ENTRANCE_LINEUP_END) {
    // Two lines either side of halfway, evenly spaced across the pitch.
    const spacing = 2.6
    const x = (rec.slotIndex - 3.5) * spacing
    const z = rec.team === 'home' ? 3.2 : -3.2
    _target.set(THREE.MathUtils.clamp(x, -HALF_W + 3, HALF_W - 3), 0, z)
  } else {
    // Break for the kickoff spots.
    _target.set(rec.spawn[0], 0, rec.spawn[2])
  }

  rec.ai.behaviour = 'walkout'
  steerToward(rec, _target, input)
  // Players spawn all over the pitch, so let anyone still a long way from their
  // mark jog rather than dawdle — otherwise the keeper is still walking when
  // the camera sweep reaches them.
  if (elapsed < ENTRANCE_WALK_END && rec.position.distanceTo(_target) > 8) {
    input.sprinting = true
  }
  return input
}
