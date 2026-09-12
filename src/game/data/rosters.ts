import type { PlayerPosition } from '@/game/state/types'

/**
 * Five outfield attributes, 0-99. They are derived from the rating and the
 * position rather than hand-authored, so adding a player is one line of data.
 * Only the card UI reads them — the simulation uses `effectiveRating`.
 */
export interface PlayerAttributes {
  pace: number
  shooting: number
  passing: number
  defending: number
  physical: number
}

export interface RosterPlayer {
  id: string
  name: string
  number: number
  position: PlayerPosition
  rating: number
  /** True for retired greats, who sit in a separate pool on the squad screen. */
  legend: boolean
  /** Two or three words shown on the card, e.g. "Line-breaking passer". */
  trait: string
  /** A sentence shown when the card is opened. */
  bio: string
  attributes: PlayerAttributes
}

/** Shorthand row: [name, number, position, rating]. */
type Row = [string, number, PlayerPosition, number]
/** Legends carry a hand-written line; there is no generating Maradona. */
type LegendRow = [string, number, PlayerPosition, number, string, string]

/**
 * Eighteen current players per nation: 2 GK, 6 DEF, 6 MID, 4 FWD. That covers
 * every formation preset (the widest back line is five, the widest midfield
 * five) and still leaves a bench.
 */
const SQUADS: Record<string, Row[]> = {
  BRA: [
    ['Alisson', 1, 'GK', 89], ['Ederson', 23, 'GK', 85],
    ['Marquinhos', 4, 'DEF', 86], ['É. Militão', 3, 'DEF', 84],
    ['G. Magalhães', 14, 'DEF', 84], ['Danilo', 2, 'DEF', 81],
    ['Wendell', 6, 'DEF', 78], ['Carlos Augusto', 16, 'DEF', 79],
    ['Casemiro', 5, 'MID', 84], ['B. Guimarães', 8, 'MID', 85],
    ['L. Paquetá', 10, 'MID', 83], ['Raphinha', 11, 'MID', 88],
    ['Gerson', 15, 'MID', 82], ['André', 17, 'MID', 81],
    ['Vinícius Jr', 7, 'FWD', 90], ['Rodrygo', 9, 'FWD', 85],
    ['G. Jesus', 19, 'FWD', 82], ['Endrick', 18, 'FWD', 80],
  ],
  ARG: [
    ['E. Martínez', 23, 'GK', 87], ['G. Rulli', 12, 'GK', 80],
    ['C. Romero', 13, 'DEF', 86], ['N. Otamendi', 19, 'DEF', 82],
    ['N. Molina', 26, 'DEF', 82], ['N. Tagliafico', 3, 'DEF', 80],
    ['M. Acuña', 8, 'DEF', 81], ['L. Martínez Quarta', 25, 'DEF', 79],
    ['R. De Paul', 7, 'MID', 84], ['E. Fernández', 24, 'MID', 85],
    ['A. Mac Allister', 20, 'MID', 86], ['G. Lo Celso', 18, 'MID', 80],
    ['L. Paredes', 5, 'MID', 80], ['N. González', 11, 'MID', 82],
    ['L. Messi', 10, 'FWD', 91], ['J. Álvarez', 9, 'FWD', 86],
    ['L. Martínez', 22, 'FWD', 87], ['Á. Correa', 15, 'FWD', 79],
  ],
  FRA: [
    ['M. Maignan', 16, 'GK', 87], ['B. Samba', 1, 'GK', 80],
    ['W. Saliba', 17, 'DEF', 87], ['D. Upamecano', 4, 'DEF', 84],
    ['J. Koundé', 5, 'DEF', 85], ['T. Hernández', 22, 'DEF', 84],
    ['I. Konaté', 15, 'DEF', 84], ['J. Clauss', 21, 'DEF', 79],
    ['A. Tchouaméni', 8, 'MID', 85], ['E. Camavinga', 6, 'MID', 84],
    ['A. Griezmann', 7, 'MID', 86], ['A. Rabiot', 14, 'MID', 83],
    ['N. Kanté', 13, 'MID', 83], ['W. Zaïre-Emery', 18, 'MID', 82],
    ['K. Mbappé', 10, 'FWD', 91], ['O. Dembélé', 11, 'FWD', 88],
    ['R. Kolo Muani', 12, 'FWD', 81], ['B. Barcola', 20, 'FWD', 82],
  ],
  ENG: [
    ['J. Pickford', 1, 'GK', 84], ['D. Henderson', 12, 'GK', 79],
    ['J. Stones', 5, 'DEF', 85], ['M. Guéhi', 6, 'DEF', 83],
    ['K. Walker', 2, 'DEF', 82], ['L. Hall', 3, 'DEF', 79],
    ['T. Alexander-Arnold', 16, 'DEF', 86], ['E. Konsa', 15, 'DEF', 79],
    ['D. Rice', 4, 'MID', 88], ['J. Bellingham', 10, 'MID', 90],
    ['C. Palmer', 20, 'MID', 86], ['M. Rogers', 8, 'MID', 81],
    ['K. Mainoo', 22, 'MID', 80], ['C. Gallagher', 26, 'MID', 79],
    ['H. Kane', 9, 'FWD', 90], ['B. Saka', 7, 'FWD', 87],
    ['P. Foden', 11, 'FWD', 88], ['A. Gordon', 17, 'FWD', 82],
  ],
  GER: [
    ['M. ter Stegen', 1, 'GK', 87], ['O. Baumann', 12, 'GK', 79],
    ['A. Rüdiger', 2, 'DEF', 85], ['J. Tah', 4, 'DEF', 83],
    ['J. Kimmich', 6, 'DEF', 87], ['D. Raum', 3, 'DEF', 80],
    ['N. Schlotterbeck', 15, 'DEF', 82], ['M. Mittelstädt', 18, 'DEF', 79],
    ['R. Andrich', 23, 'MID', 81], ['A. Pavlović', 14, 'MID', 80],
    ['F. Wirtz', 17, 'MID', 89], ['J. Musiala', 10, 'MID', 89],
    ['L. Goretzka', 8, 'MID', 82], ['P. Groß', 13, 'MID', 79],
    ['K. Havertz', 7, 'FWD', 84], ['N. Füllkrug', 9, 'FWD', 81],
    ['S. Gnabry', 20, 'FWD', 82], ['D. Undav', 11, 'FWD', 80],
  ],
  ESP: [
    ['U. Simón', 23, 'GK', 85], ['D. Raya', 1, 'GK', 84],
    ['D. Carvajal', 2, 'DEF', 86], ['R. Le Normand', 3, 'DEF', 83],
    ['A. Laporte', 14, 'DEF', 84], ['M. Cucurella', 24, 'DEF', 82],
    ['P. Cubarsí', 15, 'DEF', 82], ['A. Grimaldo', 21, 'DEF', 82],
    ['Rodri', 16, 'MID', 91], ['Pedri', 8, 'MID', 88],
    ['F. Ruiz', 12, 'MID', 84], ['M. Merino', 18, 'MID', 83],
    ['M. Zubimendi', 22, 'MID', 84], ['D. Olmo', 10, 'MID', 86],
    ['L. Yamal', 19, 'FWD', 89], ['N. Williams', 17, 'FWD', 86],
    ['Á. Morata', 7, 'FWD', 82], ['M. Oyarzabal', 9, 'FWD', 83],
  ],
  POR: [
    ['D. Costa', 22, 'GK', 85], ['R. Patrício', 1, 'GK', 80],
    ['R. Dias', 3, 'DEF', 88], ['G. Inácio', 4, 'DEF', 82],
    ['J. Cancelo', 20, 'DEF', 84], ['N. Mendes', 19, 'DEF', 85],
    ['D. Dalot', 2, 'DEF', 83], ['A. Silva', 13, 'DEF', 80],
    ['B. Fernandes', 8, 'MID', 88], ['Vitinha', 16, 'MID', 87],
    ['B. Silva', 10, 'MID', 86], ['J. Palhinha', 6, 'MID', 83],
    ['R. Neves', 18, 'MID', 83], ['J. Neves', 14, 'MID', 81],
    ['C. Ronaldo', 7, 'FWD', 88], ['R. Leão', 17, 'FWD', 85],
    ['G. Ramos', 26, 'FWD', 82], ['P. Neto', 11, 'FWD', 81],
  ],
  NED: [
    ['B. Verbruggen', 1, 'GK', 82], ['M. Flekken', 12, 'GK', 79],
    ['V. van Dijk', 4, 'DEF', 89], ['N. Aké', 5, 'DEF', 83],
    ['D. Dumfries', 22, 'DEF', 83], ['M. van de Ven', 3, 'DEF', 84],
    ['J. Timber', 2, 'DEF', 82], ['L. Geertruida', 15, 'DEF', 79],
    ['F. de Jong', 21, 'MID', 86], ['T. Reijnders', 14, 'MID', 84],
    ['X. Simons', 7, 'MID', 84], ['J. Schouten', 6, 'MID', 80],
    ['R. Gravenberch', 18, 'MID', 83], ['J. Veerman', 20, 'MID', 80],
    ['M. Depay', 10, 'FWD', 83], ['C. Gakpo', 11, 'FWD', 85],
    ['D. Malen', 8, 'FWD', 81], ['J. Zirkzee', 9, 'FWD', 80],
  ],
  JPN: [
    ['Z. Suzuki', 1, 'GK', 81], ['D. Schmidt', 12, 'GK', 78],
    ['K. Itakura', 4, 'DEF', 81], ['T. Tomiyasu', 16, 'DEF', 80],
    ['H. Ito', 3, 'DEF', 80], ['Y. Sugawara', 2, 'DEF', 78],
    ['K. Machida', 22, 'DEF', 79], ['S. Tanaka', 5, 'DEF', 76],
    ['W. Endo', 6, 'MID', 80], ['H. Morita', 13, 'MID', 79],
    ['T. Kubo', 11, 'MID', 84], ['R. Doan', 8, 'MID', 81],
    ['D. Kamada', 15, 'MID', 81], ['A. Tanaka', 17, 'MID', 79],
    ['K. Mitoma', 14, 'FWD', 84], ['A. Ueda', 9, 'FWD', 79],
    ['T. Minamino', 10, 'FWD', 81], ['J. Ito', 21, 'FWD', 81],
  ],
  CRO: [
    ['D. Livaković', 1, 'GK', 82], ['I. Ivušić', 12, 'GK', 77],
    ['J. Gvardiol', 20, 'DEF', 87], ['J. Šutalo', 5, 'DEF', 79],
    ['J. Stanišić', 2, 'DEF', 80], ['B. Sosa', 3, 'DEF', 78],
    ['D. Vida', 21, 'DEF', 77], ['B. Barišić', 22, 'DEF', 76],
    ['L. Modrić', 10, 'MID', 86], ['M. Kovačić', 8, 'MID', 84],
    ['M. Brozović', 11, 'MID', 83], ['N. Vlašić', 13, 'MID', 79],
    ['L. Sučić', 15, 'MID', 79], ['M. Pašalić', 14, 'MID', 79],
    ['A. Kramarić', 9, 'FWD', 82], ['A. Budimir', 17, 'FWD', 79],
    ['I. Perišić', 4, 'FWD', 82], ['M. Petković', 16, 'FWD', 78],
  ],
  MEX: [
    ['G. Ochoa', 13, 'GK', 79], ['L. Malagón', 1, 'GK', 78],
    ['C. Montes', 3, 'DEF', 79], ['J. Vásquez', 2, 'DEF', 79],
    ['J. Sánchez', 19, 'DEF', 77], ['J. Gallardo', 23, 'DEF', 77],
    ['K. Álvarez', 21, 'DEF', 78], ['I. Lira', 5, 'DEF', 76],
    ['E. Álvarez', 4, 'MID', 84], ['L. Chávez', 14, 'MID', 79],
    ['O. Pineda', 6, 'MID', 78], ['E. Sánchez', 8, 'MID', 77],
    ['C. Rodríguez', 16, 'MID', 79], ['L. Romo', 18, 'MID', 78],
    ['S. Giménez', 9, 'FWD', 83], ['H. Lozano', 22, 'FWD', 81],
    ['R. Jiménez', 7, 'FWD', 80], ['A. Vega', 11, 'FWD', 78],
  ],
  MAR: [
    ['Y. Bounou', 1, 'GK', 84], ['M. El Kajoui', 12, 'GK', 76],
    ['A. Hakimi', 2, 'DEF', 87], ['N. Aguerd', 5, 'DEF', 81],
    ['R. Saïss', 6, 'DEF', 79], ['N. Mazraoui', 3, 'DEF', 81],
    ['J. El Yamiq', 14, 'DEF', 77], ['Y. Attiat-Allah', 21, 'DEF', 76],
    ['S. Amrabat', 4, 'MID', 80], ['A. Ounahi', 8, 'MID', 79],
    ['B. El Khannouss', 18, 'MID', 80], ['A. Richardson', 15, 'MID', 78],
    ['A. Ezzalzouli', 17, 'MID', 80], ['I. Chair', 11, 'MID', 78],
    ['Y. En-Nesyri', 19, 'FWD', 82], ['B. Díaz', 10, 'FWD', 83],
    ['H. Ziyech', 7, 'FWD', 82], ['A. Harit', 20, 'FWD', 78],
  ],
}

/**
 * Five retired greats per nation. They are picked exactly like current players
 * — the squad screen simply keeps them in their own tab — and are a shade
 * better than anyone in the modern squad, which is the point of picking them.
 */
const LEGENDS: Record<string, LegendRow[]> = {
  BRA: [
    ['Pelé', 10, 'FWD', 96, 'Complete forward', 'Three World Cups and a thousand goals; scored with both feet and his head from anywhere.'],
    ['Ronaldo', 9, 'FWD', 95, 'Explosive finisher', 'O Fenômeno: the fastest centre-forward football has seen, and a finisher who never panicked.'],
    ['Ronaldinho', 10, 'MID', 94, 'Invented angles', 'Played with a grin. The elástico, the no-look pass, and free kicks nobody saw coming.'],
    ['R. Carlos', 6, 'DEF', 91, 'Thunderous left foot', 'A left-back who overlapped like a winger and struck free kicks that appeared to bend twice.'],
    ['Cafu', 2, 'DEF', 90, 'Tireless overlap', 'Two World Cup finals as captain on the right, up and back for ninety minutes without complaint.'],
  ],
  ARG: [
    ['D. Maradona', 10, 'MID', 96, 'Low centre of gravity', 'Carried a team on his own in 1986. Impossible to knock off the ball in a phone box.'],
    ['G. Batistuta', 9, 'FWD', 92, 'Ferocious striker', 'Batigol: hit shots so hard that placement was optional. Argentina\'s benchmark for a number nine.'],
    ['J. Riquelme', 10, 'MID', 91, 'Slows the game down', 'Played at his own tempo and made everyone else play at it too. Pure vision, no hurry.'],
    ['M. Kempes', 10, 'FWD', 90, 'Big-game runner', 'Arrived late into the box all tournament in 1978 and scored in the final twice.'],
    ['J. Zanetti', 4, 'DEF', 89, 'Never beaten twice', 'Captain, full-back, midfielder — wherever the team needed him, for twenty years.'],
  ],
  FRA: [
    ['Z. Zidane', 10, 'MID', 95, 'Weightless first touch', 'The roulette, the volley, two headers in a World Cup final. Time moved slower around him.'],
    ['T. Henry', 12, 'FWD', 93, 'Glides infield', 'Started wide left, finished inside the far post. Made the hardest finish look like a pass.'],
    ['M. Platini', 10, 'MID', 92, 'Arrives in the box', 'Nine goals in one European Championship from midfield, and free kicks as a matter of routine.'],
    ['E. Cantona', 7, 'FWD', 90, 'Collar up', 'Played with his chest out and his head up. Chipped goalkeepers and then stood still.'],
    ['L. Thuram', 15, 'DEF', 89, 'Reads it early', 'Never lost his shape, never lost a duel, and scored the two goals that mattered most.'],
  ],
  ENG: [
    ['B. Moore', 6, 'DEF', 92, 'Immaculate timing', 'Won the ball with a toe rather than a tackle, then passed his way out of trouble.'],
    ['D. Beckham', 7, 'MID', 91, 'Right-foot delivery', 'Crossed with a compass. If the free kick was in range, the goalkeeper was in trouble.'],
    ['A. Shearer', 9, 'FWD', 91, 'Centre-forward play', 'Elbows out, back to goal, arm up after every goal. Scored 260 in the Premier League.'],
    ['S. Gerrard', 8, 'MID', 90, 'Drives through', 'Box to box at full speed, and a shot from thirty yards whenever the game needed one.'],
    ['P. Gascoigne', 19, 'MID', 89, 'Ran with the ball', 'The most naturally gifted English midfielder of his age, and the most fun to watch.'],
  ],
  GER: [
    ['F. Beckenbauer', 5, 'DEF', 94, 'Invented the role', 'Der Kaiser stepped out of defence with the ball and rewrote what a defender could be.'],
    ['G. Müller', 13, 'FWD', 93, 'Six-yard genius', 'Scored from angles that did not exist. Quick over one yard, which was all he needed.'],
    ['L. Matthäus', 10, 'MID', 92, 'Engine and shot', 'Covered every blade of grass for two decades and hit the ball like a defender clearing it.'],
    ['O. Kahn', 1, 'GK', 91, 'Terrifying presence', 'Carried Germany to a final almost alone and shouted at his defence the entire way.'],
    ['J. Klinsmann', 18, 'FWD', 89, 'Runs the channel', 'Relentless movement across the back line, and a diving header waiting at the end of it.'],
  ],
  ESP: [
    ['Xavi', 6, 'MID', 94, 'Never loses it', 'Turned before receiving, played the pass before the press arrived. The metronome of two eras.'],
    ['A. Iniesta', 8, 'MID', 94, 'Escapes pressure', 'Walked out of crowded midfields as if they were empty, then scored in a World Cup final.'],
    ['I. Casillas', 1, 'GK', 92, 'Reflex stopper', 'San Iker: the save off the line in a final that a goalkeeper has no business making.'],
    ['Raúl', 7, 'FWD', 90, 'Ice in the box', 'Quiet, sharp, always in the right place, and a finish with the outside of the boot.'],
    ['C. Puyol', 5, 'DEF', 89, 'Wins everything', 'All hair and heart. Headed Spain into their only World Cup final.'],
  ],
  POR: [
    ['Eusébio', 9, 'FWD', 94, 'Panther of Lisbon', 'Nine goals at the 1966 World Cup and a right foot that could break a net.'],
    ['L. Figo', 7, 'MID', 92, 'Beats you outside', 'Took the full-back on every single time, then whipped it in with the outside of the foot.'],
    ['R. Costa', 10, 'MID', 90, 'Classic ten', 'Played the pass everyone else could see but nobody else could hit.'],
    ['Deco', 20, 'MID', 89, 'Finds the half-space', 'Small, low, impossible to press. Always available, always facing forward.'],
    ['R. Carvalho', 6, 'DEF', 88, 'Positionally perfect', 'Rarely had to sprint because he was already standing where the ball was going.'],
  ],
  NED: [
    ['J. Cruyff', 14, 'FWD', 96, 'Total football', 'Changed the sport twice: once as a player, once as a coach. And named a turn after himself.'],
    ['M. van Basten', 9, 'FWD', 94, 'Impossible angles', 'The volley from the touchline in the 1988 final remains the best goal ever scored in a final.'],
    ['R. Gullit', 10, 'MID', 92, 'Power and grace', 'Played anywhere across the front and midfield and was the best player on the pitch in all of them.'],
    ['D. Bergkamp', 10, 'FWD', 92, 'First touch of god', 'The turn against Argentina in 1998: control, spin, finish, three touches, no argument.'],
    ['F. Rijkaard', 8, 'MID', 90, 'Screens everything', 'Sat in front of the defence and made it look like the opposition had run out of ideas.'],
  ],
  JPN: [
    ['H. Nakata', 7, 'MID', 88, 'Opened the door', 'The first Japanese superstar in Europe, and a passer who always looked forward first.'],
    ['S. Nakamura', 10, 'MID', 87, 'Left-foot free kicks', 'Dead balls that started outside the post and finished inside it.'],
    ['K. Honda', 4, 'MID', 86, 'Big occasion player', 'Scored at three World Cups and never once looked like he doubted himself.'],
    ['S. Kagawa', 23, 'MID', 86, 'Between the lines', 'Quick feet in tight areas and a run into the box timed to the half-second.'],
    ['Y. Kawaguchi', 1, 'GK', 84, 'Shot-stopper', 'Made saves Japan had no right to still be in the game for.'],
  ],
  CRO: [
    ['D. Šuker', 9, 'FWD', 91, 'Left-foot finisher', 'Golden Boot in 1998 and a chip over Schmeichel that is still shown every summer.'],
    ['Z. Boban', 10, 'MID', 89, 'Captain and creator', 'Elegant on the ball and the leader of the side that put Croatia on the map.'],
    ['R. Prosinečki', 8, 'MID', 88, 'Dribbles out of trouble', 'Scored for two different countries at World Cups and made it look easy for both.'],
    ['S. Bilić', 5, 'DEF', 85, 'Aggressive stopper', 'Hard, smart, and always talking. Later coached the same way.'],
    ['R. Jarni', 3, 'DEF', 85, 'Attacking left-back', 'Bombed forward for ninety minutes and could strike it from distance too.'],
  ],
  MEX: [
    ['H. Sánchez', 11, 'FWD', 92, 'Acrobatic volleys', 'Scored 38 in a season in Spain, all of them first-time, and somersaulted after each one.'],
    ['C. Blanco', 10, 'FWD', 87, 'The cuauhtemiña', 'Trapped the ball between his ankles and hopped through defenders. Nobody else has tried it since.'],
    ['R. Márquez', 4, 'DEF', 88, 'Passes out of the back', 'Captained Mexico at five World Cups and played centre-back like a midfielder.'],
    ['J. Campos', 1, 'GK', 85, 'Kept goal and scored', 'Designed his own kits, kept goal for Mexico, and played up front when he felt like it.'],
    ['J. Borgetti', 17, 'FWD', 85, 'Best header in Mexico', 'Mexico\'s record scorer for years, and most of them came off his forehead.'],
  ],
  MAR: [
    ['M. Hadji', 10, 'MID', 88, 'Two-footed', 'African Footballer of the Year, and a striker of the ball from any range or angle.'],
    ['S. Zaki', 9, 'FWD', 86, 'Poacher', 'Africa\'s top scorer in his year and a nightmare in the six-yard box.'],
    ['S. Naybet', 5, 'DEF', 86, 'Commanding centre-back', 'Read the game a pass ahead and organised everyone around him.'],
    ['S. Bassir', 11, 'FWD', 84, 'Quick off the mark', 'Scored twice against Scotland in 1998 and terrified full-backs for a decade.'],
    ['M. Timoumi', 8, 'MID', 85, 'Ball on a string', 'The most technically gifted Moroccan of his era; dribbled through whole midfields.'],
  ],
}

/** Deterministic small hash, so a player's derived numbers never change. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** Per-position lean applied to the derived attributes, in rating points. */
const ATTRIBUTE_LEAN: Record<PlayerPosition, PlayerAttributes> = {
  GK: { pace: -14, shooting: -30, passing: -8, defending: 6, physical: 4 },
  DEF: { pace: -3, shooting: -18, passing: -5, defending: 10, physical: 8 },
  MID: { pace: 0, shooting: -3, passing: 8, defending: -2, physical: -2 },
  FWD: { pace: 7, shooting: 9, passing: -4, defending: -18, physical: 0 },
}

const ATTRIBUTE_KEYS = [
  'pace',
  'shooting',
  'passing',
  'defending',
  'physical',
] as const

function deriveAttributes(
  id: string,
  position: PlayerPosition,
  rating: number,
): PlayerAttributes {
  const lean = ATTRIBUTE_LEAN[position]
  const out = {} as PlayerAttributes
  for (const key of ATTRIBUTE_KEYS) {
    // ±5 of deterministic spread on top of the positional lean, so two players
    // on the same rating still have visibly different cards.
    const spread = (hash(id + key) - 0.5) * 10
    out[key] = Math.round(
      Math.max(35, Math.min(99, rating + lean[key] + spread)),
    )
  }
  return out
}

/** Trait lines, chosen by whichever derived attribute stands out most. */
const TRAITS: Record<PlayerPosition, Record<string, string>> = {
  GK: {
    pace: 'Sweeper keeper',
    shooting: 'Booming kick',
    passing: 'Starts the build-up',
    defending: 'Commands the box',
    physical: 'Huge reach',
  },
  DEF: {
    pace: 'Recovery pace',
    shooting: 'Threat from set pieces',
    passing: 'Line-breaking passer',
    defending: 'Wins everything',
    physical: 'Wall in the air',
  },
  MID: {
    pace: 'Carries it forward',
    shooting: 'Shoots from range',
    passing: 'Sets the tempo',
    defending: 'Breaks it up',
    physical: 'Box to box',
  },
  FWD: {
    pace: 'Runs in behind',
    shooting: 'Clinical finisher',
    passing: 'Drops in and links',
    defending: 'Presses from the front',
    physical: 'Holds it up',
  },
}

const ROLE_WORD: Record<PlayerPosition, string> = {
  GK: 'goalkeeper',
  DEF: 'defender',
  MID: 'midfielder',
  FWD: 'forward',
}

function standoutKey(attrs: PlayerAttributes): string {
  let best = ATTRIBUTE_KEYS[0] as string
  for (const key of ATTRIBUTE_KEYS) {
    if (attrs[key] > attrs[best as keyof PlayerAttributes]) best = key
  }
  return best
}

/** A readable sentence built from the numbers, so no bio has to be written. */
function deriveBio(
  name: string,
  position: PlayerPosition,
  rating: number,
  attrs: PlayerAttributes,
): string {
  const tier =
    rating >= 88
      ? 'A first-name-only'
      : rating >= 84
        ? 'An established'
        : rating >= 80
          ? 'A dependable'
          : 'A hard-working'
  const key = standoutKey(attrs)
  const detail: Record<string, string> = {
    pace: `${name} beats people for speed before they have set themselves`,
    shooting: `${name} strikes the ball cleanly and early`,
    passing: `${name} finds the pass a beat before anyone expects it`,
    defending: `${name} times the challenge instead of diving in`,
    physical: `${name} simply does not get moved off the ball`,
  }
  return `${tier} ${ROLE_WORD[position]}. ${detail[key]}.`
}

function buildPlayer(
  teamId: string,
  index: number,
  row: Row | LegendRow,
  legend: boolean,
): RosterPlayer {
  const [name, number, position, rating] = row
  const id = `${teamId}-${legend ? 'L' : 'P'}${index}`
  const attributes = deriveAttributes(id, position, rating)
  const trait = legend
    ? (row as LegendRow)[4]
    : TRAITS[position][standoutKey(attributes)]
  const bio = legend
    ? (row as LegendRow)[5]
    : deriveBio(name, position, rating, attributes)
  return { id, name, number, position, rating, legend, trait, bio, attributes }
}

/** Every nation's current squad, keyed by team id, with stable per-player ids. */
export const NATION_ROSTERS: Record<string, RosterPlayer[]> = Object.fromEntries(
  Object.entries(SQUADS).map(([teamId, rows]) => [
    teamId,
    rows.map((row, i) => buildPlayer(teamId, i, row, false)),
  ]),
)

/** Every nation's retired greats, in the same shape as the current squad. */
export const NATION_LEGENDS: Record<string, RosterPlayer[]> = Object.fromEntries(
  Object.entries(LEGENDS).map(([teamId, rows]) => [
    teamId,
    rows.map((row, i) => buildPlayer(teamId, i, row, true)),
  ]),
)

/** Current squad plus legends — the full pool the squad editor can pick from. */
export function playerPool(teamId: string): RosterPlayer[] {
  return [...(NATION_ROSTERS[teamId] ?? []), ...(NATION_LEGENDS[teamId] ?? [])]
}

/** Flat lookup across every nation and both pools: player id -> roster info. */
export const PLAYER_INFO: Record<string, RosterPlayer> = Object.fromEntries(
  [...Object.values(NATION_ROSTERS), ...Object.values(NATION_LEGENDS)]
    .flat()
    .map((p) => [p.id, p]),
)
