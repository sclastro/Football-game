import * as THREE from 'three'
import { playerRegistry } from './worldRegistry'

/**
 * Screen-space player picking.
 *
 * Rather than raycasting against 3D colliders, this projects each selectable
 * player to screen coordinates and picks the closest one to the tap. That is
 * far more forgiving on a phone (players are small on a wide broadcast camera),
 * costs almost nothing for eight players, and — crucially — works from the HTML
 * control overlay, which sits above the canvas and would otherwise swallow
 * every pointer event before R3F could see it.
 */
const picker: {
  camera: THREE.Camera | null
  canvas: HTMLCanvasElement | null
} = { camera: null, canvas: null }

export function registerPicker(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
): void {
  picker.camera = camera
  picker.canvas = canvas
}

const _p = new THREE.Vector3()
/** Roughly chest height, so the tap target sits on the body not the feet. */
const PICK_HEIGHT = 1.0

/**
 * Project a world point to viewport pixels, or null if the scene is not live
 * yet. Used by the shootout, which draws its aiming circles as HTML directly
 * over the real goal mouth rather than guessing where it is on screen.
 */
export function projectToScreen(
  x: number,
  y: number,
  z: number,
): { x: number; y: number } | null {
  const { camera, canvas } = picker
  if (!camera || !canvas) return null
  const rect = canvas.getBoundingClientRect()
  _p.set(x, y, z).project(camera)
  return {
    x: rect.left + ((_p.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - _p.y) / 2) * rect.height,
  }
}

/**
 * The nearest selectable home outfielder to a screen point, or null if nothing
 * is within `maxPx`. Players behind the camera are ignored.
 */
export function pickPlayerAtScreen(
  clientX: number,
  clientY: number,
  maxPx = 80,
): string | null {
  const { camera, canvas } = picker
  if (!camera || !canvas) return null
  const rect = canvas.getBoundingClientRect()

  let best: string | null = null
  let bestDist = maxPx
  for (const rec of playerRegistry.values()) {
    if (rec.team !== 'home' || rec.isGoalkeeper) continue
    _p.set(rec.position.x, rec.position.y + PICK_HEIGHT, rec.position.z)
    _p.project(camera)
    if (_p.z > 1) continue // behind the camera
    const sx = rect.left + ((_p.x + 1) / 2) * rect.width
    const sy = rect.top + ((1 - _p.y) / 2) * rect.height
    const d = Math.hypot(sx - clientX, sy - clientY)
    if (d < bestDist) {
      bestDist = d
      best = rec.id
    }
  }
  return best
}
