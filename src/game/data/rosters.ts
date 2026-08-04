import type { PlayerPosition } from '@/game/state/types'
import { FORMATION } from './formations'

export interface RosterPlayer {
  id: string
  name: string
  number: number
  position: PlayerPosition
  /**
   * Cosmetic only. Drives the star display and the AUTO PICK ordering; it is
   * deliberately never read by the simulation, so picking "better" players
   * changes nothing about how the match plays.
   */
  rating: number
}

/** Shorthand row: [name, number, position, rating]. */
type Row = [string, number, PlayerPosition, number]

/**
 * Twelve players per nation: 2 GK, 4 DEF, 4 MID, 2 FWD — enough to fill the
 * 8-a-side starting shape (GK + 3 DEF + 3 MID + 1 FWD) with four on the bench.
 */
const SQUADS: Record<string, Row[]> = {
  BRA: [
    ['Alisson', 1, 'GK', 89], ['Ederson', 23, 'GK', 85],
    ['Marquinhos', 4, 'DEF', 86], ['É. Militão', 3, 'DEF', 84],
    ['Danilo', 2, 'DEF', 81], ['Wendell', 6, 'DEF', 78],
    ['Casemiro', 5, 'MID', 84], ['B. Guimarães', 8, 'MID', 85],
    ['L. Paquetá', 10, 'MID', 83], ['Raphinha', 11, 'MID', 88],
    ['Vinícius Jr', 7, 'FWD', 90], ['Rodrygo', 9, 'FWD', 85],
  ],
  ARG: [
    ['E. Martínez', 23, 'GK', 87], ['G. Rulli', 12, 'GK', 80],
    ['C. Romero', 13, 'DEF', 86], ['N. Otamendi', 19, 'DEF', 82],
    ['N. Molina', 26, 'DEF', 82], ['N. Tagliafico', 3, 'DEF', 80],
    ['R. De Paul', 7, 'MID', 84], ['E. Fernández', 24, 'MID', 85],
    ['A. Mac Allister', 20, 'MID', 86], ['G. Lo Celso', 18, 'MID', 80],
    ['L. Messi', 10, 'FWD', 91], ['J. Álvarez', 9, 'FWD', 86],
  ],
  FRA: [
    ['M. Maignan', 16, 'GK', 87], ['B. Samba', 1, 'GK', 80],
    ['W. Saliba', 17, 'DEF', 87], ['D. Upamecano', 4, 'DEF', 84],
    ['J. Koundé', 5, 'DEF', 85], ['T. Hernández', 22, 'DEF', 84],
    ['A. Tchouaméni', 8, 'MID', 85], ['E. Camavinga', 6, 'MID', 84],
    ['A. Griezmann', 7, 'MID', 86], ['A. Rabiot', 14, 'MID', 83],
    ['K. Mbappé', 10, 'FWD', 91], ['O. Dembélé', 11, 'FWD', 88],
  ],
  ENG: [
    ['J. Pickford', 1, 'GK', 84], ['D. Henderson', 12, 'GK', 79],
    ['J. Stones', 5, 'DEF', 85], ['M. Guéhi', 6, 'DEF', 83],
    ['K. Walker', 2, 'DEF', 82], ['L. Hall', 3, 'DEF', 79],
    ['D. Rice', 4, 'MID', 88], ['J. Bellingham', 10, 'MID', 90],
    ['C. Palmer', 20, 'MID', 86], ['M. Rogers', 8, 'MID', 81],
    ['H. Kane', 9, 'FWD', 90], ['B. Saka', 7, 'FWD', 87],
  ],
  GER: [
    ['M. ter Stegen', 1, 'GK', 87], ['O. Baumann', 12, 'GK', 79],
    ['A. Rüdiger', 2, 'DEF', 85], ['J. Tah', 4, 'DEF', 83],
    ['J. Kimmich', 6, 'DEF', 87], ['D. Raum', 3, 'DEF', 80],
    ['R. Andrich', 23, 'MID', 81], ['A. Pavlović', 14, 'MID', 80],
    ['F. Wirtz', 17, 'MID', 89], ['J. Musiala', 10, 'MID', 89],
    ['K. Havertz', 7, 'FWD', 84], ['N. Füllkrug', 9, 'FWD', 81],
  ],
  ESP: [
    ['U. Simón', 23, 'GK', 85], ['D. Raya', 1, 'GK', 84],
    ['D. Carvajal', 2, 'DEF', 86], ['R. Le Normand', 3, 'DEF', 83],
    ['A. Laporte', 14, 'DEF', 84], ['M. Cucurella', 24, 'DEF', 82],
    ['Rodri', 16, 'MID', 91], ['Pedri', 8, 'MID', 88],
    ['F. Ruiz', 12, 'MID', 84], ['M. Merino', 18, 'MID', 83],
    ['L. Yamal', 19, 'FWD', 89], ['N. Williams', 17, 'FWD', 86],
  ],
  POR: [
    ['D. Costa', 22, 'GK', 85], ['R. Patrício', 1, 'GK', 80],
    ['R. Dias', 3, 'DEF', 88], ['G. Inácio', 4, 'DEF', 82],
    ['J. Cancelo', 20, 'DEF', 84], ['N. Mendes', 19, 'DEF', 85],
    ['B. Fernandes', 8, 'MID', 88], ['Vitinha', 16, 'MID', 87],
    ['B. Silva', 10, 'MID', 86], ['J. Palhinha', 6, 'MID', 83],
    ['C. Ronaldo', 7, 'FWD', 88], ['R. Leão', 17, 'FWD', 85],
  ],
  NED: [
    ['B. Verbruggen', 1, 'GK', 82], ['M. Flekken', 12, 'GK', 79],
    ['V. van Dijk', 4, 'DEF', 89], ['N. Aké', 5, 'DEF', 83],
    ['D. Dumfries', 22, 'DEF', 83], ['M. van de Ven', 3, 'DEF', 84],
    ['F. de Jong', 21, 'MID', 86], ['T. Reijnders', 14, 'MID', 84],
    ['X. Simons', 7, 'MID', 84], ['J. Schouten', 6, 'MID', 80],
    ['M. Depay', 10, 'FWD', 83], ['C. Gakpo', 11, 'FWD', 85],
  ],
  JPN: [
    ['Z. Suzuki', 1, 'GK', 81], ['D. Schmidt', 12, 'GK', 78],
    ['K. Itakura', 4, 'DEF', 81], ['T. Tomiyasu', 16, 'DEF', 80],
    ['H. Ito', 3, 'DEF', 80], ['Y. Sugawara', 2, 'DEF', 78],
    ['W. Endo', 6, 'MID', 80], ['H. Morita', 13, 'MID', 79],
    ['T. Kubo', 11, 'MID', 84], ['R. Doan', 8, 'MID', 81],
    ['K. Mitoma', 14, 'FWD', 84], ['A. Ueda', 9, 'FWD', 79],
  ],
  CRO: [
    ['D. Livaković', 1, 'GK', 82], ['I. Ivušić', 12, 'GK', 77],
    ['J. Gvardiol', 20, 'DEF', 87], ['J. Šutalo', 5, 'DEF', 79],
    ['J. Stanišić', 2, 'DEF', 80], ['B. Sosa', 3, 'DEF', 78],
    ['L. Modrić', 10, 'MID', 86], ['M. Kovačić', 8, 'MID', 84],
    ['M. Brozović', 11, 'MID', 83], ['N. Vlašić', 13, 'MID', 79],
    ['A. Kramarić', 9, 'FWD', 82], ['A. Budimir', 17, 'FWD', 79],
  ],
  MEX: [
    ['G. Ochoa', 13, 'GK', 79], ['L. Malagón', 1, 'GK', 78],
    ['C. Montes', 3, 'DEF', 79], ['J. Vásquez', 2, 'DEF', 79],
    ['J. Sánchez', 19, 'DEF', 77], ['J. Gallardo', 23, 'DEF', 77],
    ['E. Álvarez', 4, 'MID', 84], ['L. Chávez', 14, 'MID', 79],
    ['O. Pineda', 6, 'MID', 78], ['E. Sánchez', 8, 'MID', 77],
    ['S. Giménez', 9, 'FWD', 83], ['H. Lozano', 22, 'FWD', 81],
  ],
  MAR: [
    ['Y. Bounou', 1, 'GK', 84], ['M. El Kajoui', 12, 'GK', 76],
    ['A. Hakimi', 2, 'DEF', 87], ['N. Aguerd', 5, 'DEF', 81],
    ['R. Saïss', 6, 'DEF', 79], ['N. Mazraoui', 3, 'DEF', 81],
    ['S. Amrabat', 4, 'MID', 80], ['A. Ounahi', 8, 'MID', 79],
    ['B. El Khannouss', 18, 'MID', 80], ['A. Richardson', 15, 'MID', 78],
    ['Y. En-Nesyri', 19, 'FWD', 82], ['B. Díaz', 10, 'FWD', 83],
  ],
}

/** Every nation's squad, keyed by team id, with stable per-player ids. */
export const NATION_ROSTERS: Record<string, RosterPlayer[]> = Object.fromEntries(
  Object.entries(SQUADS).map(([teamId, rows]) => [
    teamId,
    rows.map(([name, number, position, rating], i) => ({
      id: `${teamId}-${i}`,
      name,
      number,
      position,
      rating,
    })),
  ]),
)

/** Flat lookup across every nation: player id -> roster info. */
export const PLAYER_INFO: Record<string, RosterPlayer> = Object.fromEntries(
  Object.values(NATION_ROSTERS)
    .flat()
    .map((p) => [p.id, p]),
)

/**
 * Fill the 8 formation slots with the best available player for each slot's
 * role, falling back to the best remaining player of any position. Returns ids
 * in FORMATION slot order.
 */
export function autoPickSquad(teamId: string): string[] {
  const pool = [...(NATION_ROSTERS[teamId] ?? [])].sort(
    (a, b) => b.rating - a.rating,
  )
  const used = new Set<string>()
  return FORMATION.map((slot) => {
    const byRole = pool.find((p) => !used.has(p.id) && p.position === slot.role)
    const chosen = byRole ?? pool.find((p) => !used.has(p.id))
    if (chosen) used.add(chosen.id)
    return chosen?.id ?? ''
  })
}

/** Everyone in the nation's squad who is not in the starting eight. */
export function benchFor(teamId: string, squad: string[]): string[] {
  const starting = new Set(squad)
  return (NATION_ROSTERS[teamId] ?? [])
    .filter((p) => !starting.has(p.id))
    .map((p) => p.id)
}
