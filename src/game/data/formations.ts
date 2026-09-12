import type { PlayerPosition } from '@/game/state/types'
import { FIELD_DIMENSIONS } from '@/game/entities/Field'

const HALF_W = FIELD_DIMENSIONS.width / 2
const HALF_L = FIELD_DIMENSIONS.length / 2

/** How a shape is meant to be used. Shown on the formation picker. */
export type FormationStyle = 'attack' | 'defend' | 'counter'

export interface FormationSlot {
  role: PlayerPosition
  isGoalkeeper: boolean
  /** Fraction of the half-width. -1 = left touchline, +1 = right touchline. */
  fx: number
  /** Fraction of the half-length. -1 = own goal line, +1 = opponent's. */
  fz: number
  /** Resolved metres, for a team that defends -Z. */
  x: number
  z: number
  /**
   * How far forward of their own slot this player pushes while their team
   * attacks, and how far back they drop while it defends — both as fractions of
   * the half-length.
   *
   * Bands are anchored to the SLOT rather than to the role, which is what makes
   * a 5-3-2 wing-back and a 3-5-2 wing-back behave differently even though both
   * are filed as midfielders.
   */
  push: number
  drop: number
}

/** Default roam allowances by role, overridden per slot where it matters. */
const ROAM: Record<PlayerPosition, { push: number; drop: number }> = {
  GK: { push: 0.05, drop: 0.03 },
  DEF: { push: 0.3, drop: 0.24 },
  MID: { push: 0.46, drop: 0.42 },
  FWD: { push: 0.5, drop: 0.46 },
}

function slot(
  role: PlayerPosition,
  fx: number,
  fz: number,
  over: Partial<Pick<FormationSlot, 'push' | 'drop' | 'isGoalkeeper'>> = {},
): FormationSlot {
  return {
    role,
    isGoalkeeper: over.isGoalkeeper ?? false,
    fx,
    fz,
    x: fx * HALF_W,
    z: fz * HALF_L,
    push: over.push ?? ROAM[role].push,
    drop: over.drop ?? ROAM[role].drop,
  }
}

const gk = () => slot('GK', 0, -0.94, { isGoalkeeper: true })

export interface Formation {
  id: string
  /** "4-3-3" — what goes on the button. */
  name: string
  style: FormationStyle
  /** One line explaining when to pick it. */
  summary: string
  slots: FormationSlot[]
}

/**
 * Every shape is written for a team defending the -Z goal; the away side
 * mirrors. Positions are fractions of the pitch, so resizing the pitch keeps
 * every shape proportional.
 */
export const FORMATIONS: Formation[] = [
  {
    id: '433',
    name: '4-3-3',
    style: 'attack',
    summary: 'Three forwards and width high up. Take the game to them.',
    slots: [
      gk(),
      slot('DEF', -0.78, -0.56), slot('DEF', -0.28, -0.68),
      slot('DEF', 0.28, -0.68), slot('DEF', 0.78, -0.56),
      slot('MID', -0.36, -0.2), slot('MID', 0, -0.32, { push: 0.3 }),
      slot('MID', 0.36, -0.2),
      slot('FWD', -0.64, 0.2), slot('FWD', 0, 0.32), slot('FWD', 0.64, 0.2),
    ],
  },
  {
    id: '4231',
    name: '4-2-3-1',
    style: 'attack',
    summary: 'Two holders behind a creative three. Control with a threat.',
    slots: [
      gk(),
      slot('DEF', -0.78, -0.56), slot('DEF', -0.28, -0.68),
      slot('DEF', 0.28, -0.68), slot('DEF', 0.78, -0.56),
      slot('MID', -0.22, -0.38, { push: 0.28 }),
      slot('MID', 0.22, -0.38, { push: 0.28 }),
      slot('MID', -0.54, 0.0), slot('MID', 0, 0.06), slot('MID', 0.54, 0.0),
      slot('FWD', 0, 0.34),
    ],
  },
  {
    id: '442',
    name: '4-4-2',
    style: 'counter',
    summary: 'Two flat banks. Soak it up, then hit the front two early.',
    slots: [
      gk(),
      slot('DEF', -0.76, -0.6), slot('DEF', -0.26, -0.7),
      slot('DEF', 0.26, -0.7), slot('DEF', 0.76, -0.6),
      slot('MID', -0.74, -0.16), slot('MID', -0.24, -0.28),
      slot('MID', 0.24, -0.28), slot('MID', 0.74, -0.16),
      slot('FWD', -0.2, 0.26), slot('FWD', 0.2, 0.26),
    ],
  },
  {
    id: '352',
    name: '3-5-2',
    style: 'attack',
    summary: 'Wing-backs the whole length of the pitch. Overloads everywhere.',
    slots: [
      gk(),
      slot('DEF', -0.44, -0.66), slot('DEF', 0, -0.72),
      slot('DEF', 0.44, -0.66),
      slot('MID', -0.86, -0.12, { push: 0.62, drop: 0.52 }),
      slot('MID', -0.3, -0.26), slot('MID', 0, -0.36, { push: 0.3 }),
      slot('MID', 0.3, -0.26),
      slot('MID', 0.86, -0.12, { push: 0.62, drop: 0.52 }),
      slot('FWD', -0.2, 0.3), slot('FWD', 0.2, 0.3),
    ],
  },
  {
    id: '532',
    name: '5-3-2',
    style: 'defend',
    summary: 'Five across the back. Almost nothing gets through the middle.',
    slots: [
      gk(),
      slot('DEF', -0.84, -0.48, { push: 0.34 }), slot('DEF', -0.42, -0.74),
      slot('DEF', 0, -0.8), slot('DEF', 0.42, -0.74),
      slot('DEF', 0.84, -0.48, { push: 0.34 }),
      slot('MID', -0.34, -0.36), slot('MID', 0, -0.44, { push: 0.34 }),
      slot('MID', 0.34, -0.36),
      slot('FWD', -0.2, 0.12), slot('FWD', 0.2, 0.12),
    ],
  },
  {
    id: '451',
    name: '4-5-1',
    style: 'counter',
    summary: 'A packed midfield and one runner. Win it back and go.',
    slots: [
      gk(),
      slot('DEF', -0.76, -0.62), slot('DEF', -0.26, -0.72),
      slot('DEF', 0.26, -0.72), slot('DEF', 0.76, -0.62),
      slot('MID', -0.78, -0.3, { push: 0.56 }), slot('MID', -0.3, -0.4),
      slot('MID', 0, -0.46, { push: 0.34 }), slot('MID', 0.3, -0.4),
      slot('MID', 0.78, -0.3, { push: 0.56 }),
      slot('FWD', 0, 0.2, { push: 0.6, drop: 0.5 }),
    ],
  },
  {
    id: '541',
    name: '5-4-1',
    style: 'defend',
    summary: 'Two deep banks and a lone striker. Pure damage limitation.',
    slots: [
      gk(),
      slot('DEF', -0.84, -0.54), slot('DEF', -0.44, -0.76),
      slot('DEF', 0, -0.82), slot('DEF', 0.44, -0.76),
      slot('DEF', 0.84, -0.54),
      slot('MID', -0.72, -0.32), slot('MID', -0.24, -0.42),
      slot('MID', 0.24, -0.42), slot('MID', 0.72, -0.32),
      slot('FWD', 0, 0.14, { push: 0.6 }),
    ],
  },
]

export const FORMATION_BY_ID: Record<string, Formation> = Object.fromEntries(
  FORMATIONS.map((f) => [f.id, f]),
)

export function formationById(id: string): Formation {
  return FORMATION_BY_ID[id] ?? FORMATIONS[0]
}

/**
 * The three shapes each nation is offered, in attack / counter / defend order.
 * They are chosen to match how the side actually plays, so the recommendation
 * means something rather than being the same list twelve times.
 */
export const RECOMMENDED_FORMATIONS: Record<string, [string, string, string]> = {
  BRA: ['433', '442', '532'],
  ARG: ['4231', '442', '541'],
  FRA: ['433', '4231', '532'],
  ENG: ['4231', '442', '532'],
  GER: ['433', '4231', '541'],
  ESP: ['433', '4231', '532'],
  POR: ['4231', '433', '541'],
  NED: ['433', '352', '532'],
  JPN: ['4231', '442', '541'],
  CRO: ['4231', '451', '532'],
  MEX: ['433', '451', '541'],
  MAR: ['352', '451', '532'],
}

export function recommendedFor(teamId: string): Formation[] {
  const ids = RECOMMENDED_FORMATIONS[teamId] ?? ['433', '442', '532']
  return ids.map(formationById)
}

/** The shape a team starts with if nobody has chosen one. */
export function defaultFormationId(teamId: string): string {
  return (RECOMMENDED_FORMATIONS[teamId] ?? ['433'])[0]
}

/** How many players each side puts on the pitch. */
export const SQUAD_SIZE = 11

// Home defends +Z (the goal nearest the camera) and attacks -Z; away mirrors.
/** Home home-position for a slot (defends +Z, near camera). */
export function homePosition(slot: FormationSlot): [number, number, number] {
  return [slot.x, 1, -slot.z]
}

/** Away home-position mirrors: defends -Z, attacks +Z. */
export function awayPosition(slot: FormationSlot): [number, number, number] {
  return [-slot.x, 1, slot.z]
}

/**
 * The forward and backward limit for a slot, as fractions of the half-length in
 * that team's own frame (-1 = own goal line). Returned low-first.
 */
export function slotBand(
  slot: FormationSlot,
  attacking: boolean,
): [number, number] {
  const lo = attacking ? slot.fz - 0.14 : slot.fz - slot.drop
  const hi = attacking ? slot.fz + slot.push : slot.fz + 0.12
  return [Math.max(-1, lo), Math.min(0.98, hi)]
}
