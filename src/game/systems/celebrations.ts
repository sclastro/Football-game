import * as THREE from 'three'

export type CelebrationKind =
  | 'armsUp'
  | 'kneeSlide'
  | 'heartHands'
  | 'armsCrossed'
  | 'pointToSky'

const KINDS: CelebrationKind[] = [
  'armsUp',
  'kneeSlide',
  'heartHands',
  'armsCrossed',
  'pointToSky',
]

/** The limb groups a celebration animates. All are optional. */
export interface CelebrationRefs {
  group: THREE.Group | null
  lean: THREE.Group | null
  leftArm: THREE.Group | null
  rightArm: THREE.Group | null
  leftLeg: THREE.Group | null
  rightLeg: THREE.Group | null
}

/**
 * Deterministic pick from a seed, so the same scorer in the same goal always
 * does the same thing (no flickering between routines mid-celebration) but
 * different goals look different.
 */
export function pickCelebration(seed: string): CelebrationKind {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
  return KINDS[h % KINDS.length]
}

/**
 * Pose the model for a celebration. `t` runs 0 → 1 across the celebration, so
 * each routine is a small hand-authored keyframe curve rather than a rig.
 *
 * Every routine writes ALL the limbs it touches on every call, so it fully
 * overrides whatever the run cycle just wrote.
 */
export function applyCelebration(
  kind: CelebrationKind,
  t: number,
  refs: CelebrationRefs,
): void {
  const { group, lean, leftArm, rightArm, leftLeg, rightLeg } = refs
  // Common: a quick burst that settles, used to time the big movements.
  const burst = Math.min(1, t * 3)
  const wave = Math.sin(t * Math.PI * 6)

  switch (kind) {
    case 'armsUp': {
      // Both arms thrown wide, bouncing on the spot.
      if (group) group.position.y += Math.abs(Math.sin(t * Math.PI * 7)) * 0.32
      leftArm?.rotation.set(0, 0, 2.5 * burst)
      rightArm?.rotation.set(0, 0, -2.5 * burst)
      leftLeg?.rotation.set(0, 0, 0)
      rightLeg?.rotation.set(0, 0, 0)
      if (lean) lean.rotation.x = -0.12 * burst
      break
    }
    case 'kneeSlide': {
      // Drop into a knee slide: lean back, legs tucked, arms flung out.
      const slide = Math.min(1, t * 2.2)
      if (lean) lean.rotation.x = 0.75 * slide
      if (group) group.position.y -= 0.34 * slide
      leftLeg?.rotation.set(-1.25 * slide, 0, 0)
      rightLeg?.rotation.set(0.55 * slide, 0, 0)
      leftArm?.rotation.set(-0.4, 0, 1.9 * slide)
      rightArm?.rotation.set(-0.4, 0, -1.9 * slide)
      break
    }
    case 'heartHands': {
      // Hands together in front of the chest, small bow.
      leftArm?.rotation.set(-1.5 * burst, 0, 0.75 * burst)
      rightArm?.rotation.set(-1.5 * burst, 0, -0.75 * burst)
      leftLeg?.rotation.set(0, 0, 0)
      rightLeg?.rotation.set(0, 0, 0)
      if (lean) lean.rotation.x = 0.18 * burst + wave * 0.03
      if (group) group.position.y += Math.abs(Math.sin(t * Math.PI * 3)) * 0.1
      break
    }
    case 'armsCrossed': {
      // Stand tall, arms folded, chin up.
      leftArm?.rotation.set(-1.7 * burst, 0, 1.15 * burst)
      rightArm?.rotation.set(-1.7 * burst, 0, -1.15 * burst)
      leftLeg?.rotation.set(0, 0, 0)
      rightLeg?.rotation.set(0, 0, 0)
      if (lean) lean.rotation.x = -0.16 * burst
      break
    }
    case 'pointToSky': {
      // One arm straight up, jogging away.
      const jog = Math.sin(t * Math.PI * 8)
      if (group) group.position.y += Math.abs(jog) * 0.16
      rightArm?.rotation.set(0, 0, -2.9 * burst)
      leftArm?.rotation.set(jog * 0.5, 0, 0)
      leftLeg?.rotation.set(jog * 0.6, 0, 0)
      rightLeg?.rotation.set(-jog * 0.6, 0, 0)
      if (lean) lean.rotation.x = -0.1
      break
    }
  }
}

/**
 * A simpler routine for team-mates near the scorer — they run in with both arms
 * raised rather than doing their own set-piece.
 */
export function applyTeammateCheer(t: number, refs: CelebrationRefs): void {
  const jog = Math.sin(t * Math.PI * 9)
  if (refs.group) refs.group.position.y += Math.abs(jog) * 0.14
  refs.leftArm?.rotation.set(0, 0, 2.1)
  refs.rightArm?.rotation.set(0, 0, -2.1)
  refs.leftLeg?.rotation.set(jog * 0.55, 0, 0)
  refs.rightLeg?.rotation.set(-jog * 0.55, 0, 0)
}
