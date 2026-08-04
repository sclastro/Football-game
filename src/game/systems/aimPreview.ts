import * as THREE from 'three'
import { PHYSICS_CONFIG } from '@/game/physics/physicsConfig'

const { mass, radius, linearDamping, restitution } = PHYSICS_CONFIG.ball
const GRAVITY_Y = PHYSICS_CONFIG.gravity[1]

/**
 * Live aim, written each frame by the controlled player and read by the
 * on-pitch indicator. Module-level so aiming never triggers a React re-render.
 */
export const aimState = {
  /** True while the user is holding the shoot control near the ball. */
  active: false,
  /** 0..1 strike power. */
  power: 0,
  /** Unit aim direction on the XZ plane. */
  dirX: 0,
  dirZ: 0,
  /** Ball position the shot would start from. */
  originX: 0,
  originY: 0,
  originZ: 0,
}

/** How many points the predicted path is drawn with. */
export const PREVIEW_SAMPLES = 26
const STEP = 0.055 // seconds per integration step
const STEPS_PER_SAMPLE = 2

/**
 * Integrate the ball's flight the same way the physics engine will, so the
 * on-pitch preview matches what actually happens when you release.
 *
 * Rapier applies linear damping as an exponential decay per step and constant
 * gravity, which is what this reproduces. One bounce is modelled so a lofted
 * shot's preview still ends somewhere meaningful rather than stopping in mid-air.
 *
 * Writes into `out` (preallocated) and returns how many points are valid, so
 * this can run every frame without allocating.
 */
export function predictPath(
  originX: number,
  originY: number,
  originZ: number,
  impulse: THREE.Vector3,
  out: THREE.Vector3[],
): number {
  let px = originX
  let py = originY
  let pz = originZ
  // An impulse is a change in momentum: v = J / m.
  let vx = impulse.x / mass
  let vy = impulse.y / mass
  let vz = impulse.z / mass

  const damp = Math.exp(-linearDamping * STEP)
  let count = 0
  let bounced = false

  for (let i = 0; i < PREVIEW_SAMPLES; i++) {
    for (let s = 0; s < STEPS_PER_SAMPLE; s++) {
      vy += GRAVITY_Y * STEP
      vx *= damp
      vy *= damp
      vz *= damp
      px += vx * STEP
      py += vy * STEP
      pz += vz * STEP

      if (py < radius) {
        py = radius
        if (!bounced && vy < 0) {
          vy = -vy * restitution
          bounced = true
        } else {
          vy = 0
        }
      }
    }
    out[count].set(px, py, pz)
    count++
    // Once it is rolling slowly the rest of the path adds nothing useful.
    if (Math.hypot(vx, vz) < 1.2 && py <= radius + 0.01) break
  }
  return count
}

/** Where the predicted path meets the ground — the landing marker's spot. */
export function landingPoint(
  path: THREE.Vector3[],
  count: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  for (let i = 1; i < count; i++) {
    if (path[i].y <= radius + 0.02) return out.copy(path[i])
  }
  return out.copy(path[Math.max(0, count - 1)])
}
