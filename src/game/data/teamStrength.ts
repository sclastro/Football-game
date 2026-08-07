import { NATION_ROSTERS } from './rosters'

/**
 * Small per-nation strength derived from the squad's average rating.
 *
 * Ratings run roughly 76–91, so this returns about -1..+1 with 83 as par. It is
 * deliberately weak: the user wants a stronger side to feel *slightly* sharper,
 * not to make the fixture a foregone conclusion. Picking better players still
 * mostly changes the names on the shirts.
 */
const PAR_RATING = 83
const RATING_SPREAD = 6

const cache = new Map<string, number>()

/** -1 (weakest nation) .. +1 (strongest), 0 at par. */
export function teamStrength(teamId: string): number {
  const cached = cache.get(teamId)
  if (cached !== undefined) return cached

  const squad = NATION_ROSTERS[teamId]
  let value = 0
  if (squad && squad.length) {
    const avg = squad.reduce((sum, p) => sum + p.rating, 0) / squad.length
    value = Math.max(-1, Math.min(1, (avg - PAR_RATING) / RATING_SPREAD))
  }
  cache.set(teamId, value)
  return value
}

/** Whole-team rating shown on the nation cards (rounded average). */
export function teamRating(teamId: string): number {
  const squad = NATION_ROSTERS[teamId]
  if (!squad || !squad.length) return 0
  return Math.round(squad.reduce((sum, p) => sum + p.rating, 0) / squad.length)
}

/** Top-rated players, for the "star names" line on a nation card. */
export function starPlayers(teamId: string, count = 3): string[] {
  const squad = NATION_ROSTERS[teamId] ?? []
  return [...squad]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
    .map((p) => p.name)
}

/**
 * A flavour label derived from where a squad's quality actually sits. Purely
 * descriptive — nothing reads this during a match.
 */
export function teamStyle(teamId: string): string {
  const squad = NATION_ROSTERS[teamId] ?? []
  if (!squad.length) return 'Balanced'
  const avgOf = (pos: string) => {
    const group = squad.filter((p) => p.position === pos)
    if (!group.length) return 0
    return group.reduce((s, p) => s + p.rating, 0) / group.length
  }
  const attack = (avgOf('FWD') * 2 + avgOf('MID')) / 3
  const defence = (avgOf('DEF') * 2 + avgOf('GK')) / 3
  const gap = attack - defence
  if (gap > 2.5) return 'Attacking'
  if (gap < -2.5) return 'Solid at the back'
  return 'Balanced'
}

/** Speed multiplier for a side: ±3 %. */
export function speedMultiplier(teamId: string): number {
  return 1 + teamStrength(teamId) * 0.03
}

/** Shot power multiplier for a side: ±6 %. */
export function shotMultiplier(teamId: string): number {
  return 1 + teamStrength(teamId) * 0.06
}
