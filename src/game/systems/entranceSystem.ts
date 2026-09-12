import * as THREE from 'three'
import { useGameStore, ENTRANCE_DURATION } from '@/game/state/gameStore'
import { type PlayerRecord } from './worldRegistry'
import { steerToward } from './aiSystem'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'
import type { InputState } from './inputSystem'

const HALF_W = FIELD_DIMENSIONS.width / 2

/**
 * Entrance timeline, in seconds from the start of the walk-out:
 *   0.0 – 3.0  both teams walk in toward the centre circle
 *   3.0 – 5.2  they hold two lines facing the camera for the sweep
 *   5.2 – 7.0  they break and walk out to their kickoff positions
 */
export const ENTRANCE_WALK_END = 3.0
export const ENTRANCE_LINEUP_END = 5.2

/** How far either side of the halfway line each team lines up. */
const LINE_OFFSET = 2.8
/** Gap between players in the line. */
const LINE_SPACING = 2.5

const _target = new THREE.Vector3()

/** Seconds since the walk-out began. */
export function entranceElapsed(): number {
  const st = useGameStore.getState()
  return ENTRANCE_DURATION - (st.entranceUntil - performance.now() / 1000)
}

/** Where a player stands in their team's line, centred on the halfway line. */
function lineUpSpot(rec: PlayerRecord, out: THREE.Vector3): THREE.Vector3 {
  const x = (rec.slotIndex - 3.5) * LINE_SPACING
  const z = rec.team === 'home' ? LINE_OFFSET : -LINE_OFFSET
  return out.set(THREE.MathUtils.clamp(x, -HALF_W + 3, HALF_W - 3), 0, z)
}

/**
 * Movement for one player during the walk-out. Uses exactly the same steering
 * and movement code as the match, so the normal walk cycle plays and nothing
 * needs hand-animating — the players simply have somewhere else to be.
 *
 * Role bands are bypassed here: a defender walking out to the halfway line for
 * the line-up is not out of position, and without the bypass they would be
 * dragged straight back toward their own box mid-ceremony.
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
  input.flickPressed = false
  input.slidePressed = false
  input.moveDirection.set(0, 0)

  if (elapsed < ENTRANCE_LINEUP_END) {
    lineUpSpot(rec, _target)
  } else {
    // Break for the kickoff spots.
    _target.set(rec.spawn[0], 0, rec.spawn[2])
  }

  rec.ai.behaviour = 'walkout'
  steerToward(rec, _target, input, true)

  // Players spawn all over the pitch, so anyone still a long way from their
  // mark jogs in — otherwise the keeper is still walking when the camera sweep
  // reaches them. Once in the line, everyone walks.
  if (elapsed < ENTRANCE_WALK_END && rec.position.distanceTo(_target) > 7) {
    input.sprinting = true
  }
  return input
}
