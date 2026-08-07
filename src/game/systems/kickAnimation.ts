import * as THREE from 'three'

export type KickKind = 'shot' | 'pass' | 'trap'

/** Seconds a keeper's dive pose plays over. */
export const DIVE_POSE_TIME = 0.55

/** How long each action plays for, in seconds. */
export const KICK_DURATIONS: Record<KickKind, number> = {
  shot: 0.44,
  pass: 0.26,
  trap: 0.3,
}

/** The joints a kick animation drives. */
export interface KickRefs {
  lean: THREE.Group | null
  leftLeg: THREE.Group | null
  rightLeg: THREE.Group | null
  leftShin: THREE.Group | null
  rightShin: THREE.Group | null
  leftArm: THREE.Group | null
  rightArm: THREE.Group | null
}

/**
 * Pose the body for a kick. `t` runs 0 → 1 across the action.
 *
 * These override whatever the run cycle wrote this frame, so each routine sets
 * every joint it cares about on every call. The striking leg is the right one
 * throughout; the left is the plant foot.
 */
export function applyKickPose(kind: KickKind, t: number, refs: KickRefs): void {
  switch (kind) {
    case 'shot':
      shotPose(t, refs)
      break
    case 'pass':
      passPose(t, refs)
      break
    case 'trap':
      trapPose(t, refs)
      break
  }
}

/**
 * A full strike: plant, load the leg back, whip through, follow through.
 *
 *   0.00–0.35  backswing — hip drives back, knee folds, torso opens
 *   0.35–0.50  contact — leg snaps straight through the ball
 *   0.50–1.00  follow-through — leg continues up, body rotates over it
 */
function shotPose(t: number, refs: KickRefs): void {
  const { lean, leftLeg, rightLeg, leftShin, rightShin, leftArm, rightArm } = refs

  let hip: number
  let knee: number
  if (t < 0.35) {
    // Load: swing the whole leg back and fold the knee.
    const k = t / 0.35
    hip = k * 0.95
    knee = k * 1.5
  } else if (t < 0.5) {
    // Strike: hip whips forward while the shin straightens out through contact.
    const k = (t - 0.35) / 0.15
    hip = 0.95 - k * 2.05
    knee = 1.5 * (1 - k)
  } else {
    // Follow-through: the leg keeps rising, then settles back.
    const k = (t - 0.5) / 0.5
    hip = -1.1 - Math.sin(k * Math.PI) * 0.35
    knee = Math.sin(k * Math.PI) * 0.25
  }

  rightLeg?.rotation.set(hip, 0, 0)
  if (rightShin) rightShin.rotation.x = knee

  // Plant foot takes the weight and stays braced.
  leftLeg?.rotation.set(0.22, 0, 0)
  if (leftShin) leftShin.rotation.x = 0.16

  // Torso counter-rotates into the strike, then over it.
  if (lean) {
    lean.rotation.x = t < 0.35 ? -0.16 * (t / 0.35) : 0.2 * Math.sin((t - 0.35) * 2.4)
    lean.rotation.y = -0.35 * Math.sin(t * Math.PI)
  }
  // Arms balance the swing: opposite arm forward, kicking-side arm back.
  leftArm?.rotation.set(-0.9 * Math.sin(t * Math.PI), 0, 0.5)
  rightArm?.rotation.set(0.7 * Math.sin(t * Math.PI), 0, -0.35)
}

/**
 * Goalkeeper dive.
 *
 * `side` is -1/+1 for a dive, or 0 to stand tall and spread. `height` runs
 * 0 (grounded, along the floor) → 0.5 (level) → 1 (full-stretch, airborne), and
 * `extend` is 0 → 1 across the dive. Returns the vertical body offset the
 * caller should apply, since a low dive drops and a high one leaves the ground.
 */
export function applyDivePose(
  side: number,
  height: number,
  extend: number,
  refs: KickRefs,
): number {
  const { lean, leftLeg, rightLeg, leftShin, rightShin, leftArm, rightArm } = refs

  if (side === 0) {
    // Staying central: plant, spread and make yourself big rather than dive.
    const spread = extend
    if (lean) {
      lean.rotation.z = 0
      lean.rotation.x = -0.12 * spread
      lean.rotation.y = 0
    }
    // Arms up and out for a high ball, down and wide for a low one.
    const armZ = THREE.MathUtils.lerp(1.1, 2.7, height)
    leftArm?.rotation.set(0, 0, armZ * spread)
    rightArm?.rotation.set(0, 0, -armZ * spread)
    leftLeg?.rotation.set(0, 0, 0.45 * spread)
    rightLeg?.rotation.set(0, 0, -0.45 * spread)
    if (leftShin) leftShin.rotation.x = 0
    if (rightShin) rightShin.rotation.x = 0
    return height > 0.7 ? 0.2 * spread : 0
  }

  // A full dive: the body rotates onto its side and stretches out.
  // Low dives lie almost flat along the ground; high ones stay more upright and
  // lift off it.
  const tilt = THREE.MathUtils.lerp(1.5, 0.85, height) * extend
  if (lean) {
    lean.rotation.z = side * tilt
    lean.rotation.x = THREE.MathUtils.lerp(0.15, -0.2, height) * extend
    lean.rotation.y = 0
  }

  // Leading arm reaches hard toward the ball; trailing arm follows across.
  const reach = THREE.MathUtils.lerp(2.2, 2.9, height) * extend
  if (side < 0) {
    leftArm?.rotation.set(0, 0, reach)
    rightArm?.rotation.set(0, 0, -reach * 0.45)
  } else {
    rightArm?.rotation.set(0, 0, -reach)
    leftArm?.rotation.set(0, 0, reach * 0.45)
  }

  // Legs trail behind the dive, tucked slightly for a low one.
  const trail = 0.55 * extend
  leftLeg?.rotation.set(-trail, 0, side * 0.3 * extend)
  rightLeg?.rotation.set(trail, 0, side * 0.3 * extend)
  const tuck = THREE.MathUtils.lerp(0.5, 0.1, height) * extend
  if (leftShin) leftShin.rotation.x = tuck
  if (rightShin) rightShin.rotation.x = tuck

  // Low dives drop toward the turf; high dives get airborne.
  return THREE.MathUtils.lerp(-0.55, 0.45, height) * extend
}

/**
 * A pass: a short, flat side-foot sweep. Deliberately smaller and quicker than
 * a shot so the two actions read differently at a glance.
 */
function passPose(t: number, refs: KickRefs): void {
  const { lean, leftLeg, rightLeg, leftShin, rightShin, leftArm, rightArm } = refs

  const swing = Math.sin(t * Math.PI)
  // Hip opens out to the side rather than driving through.
  rightLeg?.rotation.set(-0.55 * swing, 0.5 * swing, 0)
  if (rightShin) rightShin.rotation.x = 0.3 * swing

  leftLeg?.rotation.set(0.12, 0, 0)
  if (leftShin) leftShin.rotation.x = 0.1

  if (lean) {
    lean.rotation.x = 0.06 * swing
    lean.rotation.y = -0.18 * swing
  }
  leftArm?.rotation.set(-0.35 * swing, 0, 0.35)
  rightArm?.rotation.set(0.25 * swing, 0, -0.25)
}

/**
 * Receiving: the near foot reaches out and cushions the ball, body settling
 * over it. Plays during the protected window after a pass arrives, so a
 * reception reads as a deliberate touch instead of the ball snapping to a foot.
 */
function trapPose(t: number, refs: KickRefs): void {
  const { lean, leftLeg, rightLeg, leftShin, rightShin, leftArm, rightArm } = refs

  // Reach out quickly, then draw the foot back in as the ball is killed.
  const reach = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65
  rightLeg?.rotation.set(-0.6 * reach, 0, 0)
  if (rightShin) rightShin.rotation.x = 0.45 * reach

  leftLeg?.rotation.set(0.18 * reach, 0, 0)
  if (leftShin) leftShin.rotation.x = 0.3 * reach

  // Slight crouch over the ball — that's what selling a cushioned touch needs.
  if (lean) {
    lean.rotation.x = 0.22 * reach
    lean.rotation.y = 0
  }
  leftArm?.rotation.set(-0.2, 0, 0.6 * reach)
  rightArm?.rotation.set(-0.2, 0, -0.6 * reach)
}
