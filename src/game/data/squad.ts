import { NATION_ROSTERS, PLAYER_INFO, playerPool } from './rosters'
import { formationById, type Formation } from './formations'
import type { PlayerPosition } from '@/game/state/types'

/**
 * Fill a formation's slots with the best available player for each slot's role,
 * falling back to the best remaining player of any position. Returns ids in
 * slot order.
 *
 * Only current internationals are auto-picked: dropping a legend into your side
 * should be a decision you made, not one the computer made for you.
 */
export function autoPickSquad(teamId: string, formationId: string): string[] {
  const formation = formationById(formationId)
  const pool = [...(NATION_ROSTERS[teamId] ?? [])].sort(
    (a, b) => b.rating - a.rating,
  )
  const used = new Set<string>()
  return formation.slots.map((slot) => {
    const byRole = pool.find((p) => !used.has(p.id) && p.position === slot.role)
    const chosen = byRole ?? pool.find((p) => !used.has(p.id))
    if (chosen) used.add(chosen.id)
    return chosen?.id ?? ''
  })
}

/** Everyone in the nation's pool — current and legends — who is not starting. */
export function benchFor(teamId: string, squad: string[]): string[] {
  const starting = new Set(squad)
  return playerPool(teamId)
    .filter((p) => !starting.has(p.id))
    .map((p) => p.id)
}

/** Natural ordering when listing substitutes. */
const POSITION_ORDER: Record<PlayerPosition, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
}

export function sortedBench(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const pa = PLAYER_INFO[a]
    const pb = PLAYER_INFO[b]
    if (!pa || !pb) return 0
    const order = POSITION_ORDER[pa.position] - POSITION_ORDER[pb.position]
    return order !== 0 ? order : pb.rating - pa.rating
  })
}

/**
 * Move a squad from one shape to another while keeping the players you chose.
 *
 * Each slot in the new shape takes the best-rated unused player whose position
 * matches; anyone left over fills the gaps. Without this, switching from 4-3-3
 * to 5-3-2 would silently throw away every substitution you had made.
 */
export function remapSquad(squad: string[], to: Formation): string[] {
  const available = squad
    .map((id) => PLAYER_INFO[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  // Keeper first: there is exactly one and it must not be reassigned outfield.
  const used = new Set<string>()
  const out = to.slots.map((slot) => {
    const exact = available
      .filter((p) => !used.has(p.id) && p.position === slot.role)
      .sort((a, b) => b.rating - a.rating)[0]
    if (exact) {
      used.add(exact.id)
      return exact.id
    }
    return ''
  })
  // Anyone still unplaced fills the slots that found no positional match.
  const spare = available.filter((p) => !used.has(p.id))
  for (let i = 0; i < out.length && spare.length; i++) {
    if (out[i] === '') {
      const p = spare.shift()!
      used.add(p.id)
      out[i] = p.id
    }
  }
  return out
}

/** Sum of the starting eleven's ratings, 0-99. Shown on the squad screen. */
export function squadRating(squad: string[]): number {
  const ratings = squad
    .map((id) => PLAYER_INFO[id]?.rating)
    .filter((r): r is number => typeof r === 'number')
  if (!ratings.length) return 0
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
}

/** How many retired greats are in a starting eleven. */
export function legendCount(squad: string[]): number {
  return squad.filter((id) => PLAYER_INFO[id]?.legend).length
}
