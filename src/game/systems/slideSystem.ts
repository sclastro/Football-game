import * as THREE from 'three'
import {
  dribbleState,
  playerRegistry,
  clearPass,
  type PlayerRecord,
} from './worldRegistry'
import { audio } from './audio'

/** How long the slide itself lasts. */
export const SLIDE_DURATION = 0.62
/** How long the tackled player stays down before getting up on their own. */
export const KNOCKDOWN_TIME = 1.35
/** Slides you may make back to back before the leg has to come back. */
export const MAX_SLIDE_CHAIN = 3
/** Recovery after a slide inside the chain, and after the chain runs out. */
const CHAIN_RECOVERY = 0.45
const CHAIN_EXHAUSTED_RECOVERY = 2.4
/** Idle time after which the chain counter lapses back to zero. */
const CHAIN_LAPSE = 4
/** How far in front of the slider the studs reach, and how wide. */
const SLIDE_REACH = 2.3
const SLIDE_WIDTH = 1.15
/** How fast a sliding player travels, relative to their sprint speed. */
export const SLIDE_SPEED = 1.25

const _forward = new THREE.Vector3()
const _toTarget = new THREE.Vector3()

/** Can this player slide right now, and how many are left in the chain? */
export function slidesLeft(rec: PlayerRecord): number {
  const now = performance.now() / 1000
  if (now - rec.slide.lastAt > CHAIN_LAPSE) return MAX_SLIDE_CHAIN
  return Math.max(0, MAX_SLIDE_CHAIN - rec.slide.chain)
}

export function canSlide(rec: PlayerRecord): boolean {
  const now = performance.now() / 1000
  if (now < rec.slide.readyAt) return false
  if (now < rec.knockedUntil) return false
  if (rec.slide.activeUntil > now) return false
  return slidesLeft(rec) > 0
}

/**
 * Commit to a slide. Returns false if the leg is not available, which is what
 * enforces the three-in-a-row limit.
 */
export function startSlide(rec: PlayerRecord): boolean {
  if (!canSlide(rec)) return false
  const now = performance.now() / 1000
  // The chain lapses if you have not slid for a while.
  if (now - rec.slide.lastAt > CHAIN_LAPSE) rec.slide.chain = 0

  rec.slide.chain += 1
  rec.slide.lastAt = now
  rec.slide.activeUntil = now + SLIDE_DURATION
  rec.slide.hit.clear()
  rec.slide.readyAt =
    now +
    SLIDE_DURATION +
    (rec.slide.chain >= MAX_SLIDE_CHAIN ? CHAIN_EXHAUSTED_RECOVERY : CHAIN_RECOVERY)
  if (rec.slide.chain >= MAX_SLIDE_CHAIN) rec.slide.chain = 0
  audio.slide()
  return true
}

export function isSliding(rec: PlayerRecord): boolean {
  return rec.slide.activeUntil > performance.now() / 1000
}

export function isKnockedDown(rec: PlayerRecord): boolean {
  return rec.knockedUntil > performance.now() / 1000
}

/**
 * Resolve every live slide against the players in front of it.
 *
 * There are no cards and no free kicks in this game, so the rule is entirely
 * about the ball: sliding through the player who is carrying it wins the ball
 * and puts them on the floor for a moment, while sliding at anyone else does
 * absolutely nothing. That asymmetry is what makes it a decision rather than a
 * button you hold down.
 */
export function resolveSlides(): void {
  const now = performance.now() / 1000

  for (const slider of playerRegistry.values()) {
    if (slider.slide.activeUntil <= now) continue

    _forward.set(-Math.sin(slider.yaw), 0, -Math.cos(slider.yaw))

    for (const target of playerRegistry.values()) {
      if (target.team === slider.team || target.id === slider.id) continue
      if (slider.slide.hit.has(target.id)) continue
      if (now < target.knockedUntil) continue

      _toTarget.subVectors(target.position, slider.position)
      _toTarget.y = 0
      const along = _toTarget.dot(_forward)
      if (along < -0.4 || along > SLIDE_REACH) continue
      // Perpendicular distance from the line the studs are travelling down.
      const across = Math.hypot(
        _toTarget.x - _forward.x * along,
        _toTarget.z - _forward.z * along,
      )
      if (across > SLIDE_WIDTH) continue

      slider.slide.hit.add(target.id)

      // Only the carrier is affected. Everyone else is simply slid past.
      if (dribbleState.possessorId !== target.id) continue

      target.knockedUntil = now + KNOCKDOWN_TIME
      dribbleState.possessorId = slider.id
      dribbleState.possessorSince = now
      dribbleState.protectedUntil = now + 0.5
      dribbleState.lastTouchTeam = slider.team
      clearPass()
      audio.tackle()
    }
  }
}
