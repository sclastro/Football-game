import type { Difficulty } from './difficulty'
import { TEAMS, TEAM_IDS } from './teams'
import { teamStrength } from './teamStrength'
import { NATION_ROSTERS } from './rosters'
import { formationById, recommendedFor } from './formations'

/**
 * Every nation's playing identity, as five numbers the AI actually reads plus
 * the words the scouting screen shows.
 *
 * The numbers are what make Japan feel different from Brazil: the AI cascade is
 * the same for everyone, but where it presses, how quickly it moves the ball on
 * and whether it shoots or keeps looking all come from here.
 */
export interface TacticalIdentity {
  /** 0 = sit in the own half, 1 = press in the opponent's box. */
  pressHeight: number
  /** 0 = patient, 1 = play the next pass immediately. */
  tempo: number
  /** 0 = pass through the lines, 1 = go long and early. */
  directness: number
  /** 0 = everything through the middle, 1 = get to the touchline first. */
  width: number
  /** 0 = take no chances, 1 = shoot and dribble at everything. */
  risk: number
  /** 0 = deep defensive line, 1 = halfway-line offside trap. */
  line: number
  /** 0 = stand off, 1 = dive into every tackle. */
  aggression: number

  /** Two or three words for the card. */
  label: string
  /** A sentence for the nation card. */
  summary: string
  strengths: [string, string]
  weakness: string
  /** How the user should actually play against them. */
  counter: string
}

export const IDENTITY: Record<string, TacticalIdentity> = {
  BRA: {
    pressHeight: 0.68, tempo: 0.62, directness: 0.3, width: 0.72, risk: 0.78,
    line: 0.62, aggression: 0.5,
    label: 'Wing play, one-v-one',
    summary: 'Work it wide, take the full-back on, and shoot from anywhere they fancy.',
    strengths: ['Devastating wingers in isolation', 'Forwards who finish first time'],
    weakness: 'The full-backs push so high that the space behind them is always there.',
    counter: 'Win it and break down the flank they just vacated — they are slow to recover.',
  },
  ARG: {
    pressHeight: 0.6, tempo: 0.48, directness: 0.34, width: 0.4, risk: 0.55,
    line: 0.5, aggression: 0.78,
    label: 'Streetwise, aggressive',
    summary: 'Control the middle, foul the tempo out of the game, and punish one mistake.',
    strengths: ['Ruthless in front of goal', 'Nothing comes through the centre'],
    weakness: 'They commit hard to tackles — beat the first one and the shape is broken.',
    counter: 'Draw the challenge, flick it past them, and attack the gap they leave behind.',
  },
  FRA: {
    pressHeight: 0.5, tempo: 0.72, directness: 0.62, width: 0.58, risk: 0.6,
    line: 0.44, aggression: 0.55,
    label: 'Transition machine',
    summary: 'Happy without the ball, lethal the second they win it. Everything goes forward fast.',
    strengths: ['The quickest counter in the game', 'Physically dominant everywhere'],
    weakness: 'They give you the ball on purpose — if you keep it, they have no plan B.',
    counter: 'Do not over-commit. Lose it in their half and you will be two-on-four in yours.',
  },
  ENG: {
    pressHeight: 0.55, tempo: 0.5, directness: 0.45, width: 0.68, risk: 0.42,
    line: 0.52, aggression: 0.52,
    label: 'Patient, wide, set-piece',
    summary: 'Circulate it, build width, and wait for a cross or a dead ball.',
    strengths: ['Outstanding delivery from wide', 'Very hard to score against'],
    weakness: 'Slow to commit. Give them no target and they pass sideways all day.',
    counter: 'Press their centre-backs. They will go long far earlier than they want to.',
  },
  GER: {
    pressHeight: 0.82, tempo: 0.75, directness: 0.35, width: 0.5, risk: 0.6,
    line: 0.78, aggression: 0.62,
    label: 'High press, high line',
    summary: 'Suffocate you in your own half and play everything through the half-spaces.',
    strengths: ['Wins the ball back within seconds', 'Technicians in tight areas'],
    weakness: 'That defensive line is enormously high and the keeper is a long way from it.',
    counter: 'One pass over the top is worth ten through the middle. Look for the run early.',
  },
  ESP: {
    pressHeight: 0.74, tempo: 0.38, directness: 0.15, width: 0.62, risk: 0.3,
    line: 0.7, aggression: 0.45,
    label: 'Possession, positional',
    summary: 'Keep the ball until a gap appears. If none appears, they keep the ball anyway.',
    strengths: ['You may not touch it for minutes', 'Never gives it away cheaply'],
    weakness: 'Short of a plan when a side simply refuses to come out and press.',
    counter: 'Stay compact, let them pass in front of you, and go direct the moment you win it.',
  },
  POR: {
    pressHeight: 0.58, tempo: 0.6, directness: 0.4, width: 0.6, risk: 0.72,
    line: 0.56, aggression: 0.5,
    label: 'Flair and long shots',
    summary: 'Individual quality everywhere and a willingness to shoot from twenty-five yards.',
    strengths: ['Can score out of nothing', 'Midfield that never loses it'],
    weakness: 'The shots come whether they are on or not — a lot of possession ends cheaply.',
    counter: 'Block the shooting lane and make them play one more pass than they want to.',
  },
  NED: {
    pressHeight: 0.66, tempo: 0.55, directness: 0.3, width: 0.8, risk: 0.5,
    line: 0.66, aggression: 0.45,
    label: 'Total football, huge width',
    summary: 'Stretch the pitch until it tears, then play through the middle of what is left.',
    strengths: ['Uses every metre of the width', 'Superb build-up from the back'],
    weakness: 'Split so wide that the centre can be overrun by a compact midfield.',
    counter: 'Flood the middle. Make the wide men beat you on their own.',
  },
  JPN: {
    pressHeight: 0.78, tempo: 0.8, directness: 0.25, width: 0.55, risk: 0.4,
    line: 0.6, aggression: 0.58,
    label: 'Quick, coordinated press',
    summary: 'Everyone presses on the same trigger, everything is one and two touches.',
    strengths: ['Ferocious organised pressing', 'Move it on faster than you can set'],
    weakness: 'Small margins physically — they cannot bully anyone in the box.',
    counter: 'Hold the ball up, invite the press, and release past it. Then attack the air.',
  },
  CRO: {
    pressHeight: 0.45, tempo: 0.42, directness: 0.3, width: 0.48, risk: 0.45,
    line: 0.4, aggression: 0.6,
    label: 'Midfield control',
    summary: 'Win the centre of the pitch and the game comes to them. Never in a hurry.',
    strengths: ['The best passing midfield here', 'Endless in a long match'],
    weakness: 'Not quick. A direct runner at the back line causes them real problems.',
    counter: 'Bypass the midfield entirely. Run at them rather than passing around them.',
  },
  MEX: {
    pressHeight: 0.62, tempo: 0.65, directness: 0.42, width: 0.66, risk: 0.55,
    line: 0.5, aggression: 0.68,
    label: 'Energetic, front-foot',
    summary: 'Aggressive, quick down the sides, and they never stop running at you.',
    strengths: ['Relentless tempo for the full match', 'Dangerous on the break'],
    weakness: 'Emotional at the back — they can be drawn out of position.',
    counter: 'Be patient. Move them side to side and the gap between the lines appears.',
  },
  MAR: {
    pressHeight: 0.4, tempo: 0.5, directness: 0.55, width: 0.7, risk: 0.42,
    line: 0.34, aggression: 0.66,
    label: 'Low block, fast break',
    summary: 'Two banks deep, then the wing-backs go eighty metres in five seconds.',
    strengths: ['Almost impossible to break down', 'Lightning wing-backs on the turnover'],
    weakness: 'Concedes territory freely — they will let you have the ball all game.',
    counter: 'Do not force it through the middle. Work the ball wide and cross early.',
  },
}

export function identityOf(teamId: string): TacticalIdentity {
  return IDENTITY[teamId] ?? IDENTITY.ENG
}

/**
 * Difficulty sharpens every tactical number toward its extreme: a hard Germany
 * presses higher and plays quicker than an easy Germany, rather than simply
 * running faster.
 */
const DIFFICULTY_EDGE: Record<Difficulty, number> = {
  easy: -0.22,
  normal: 0,
  hard: 0.2,
}

/** The identity as the AI should actually read it for a given difficulty. */
export function tunedIdentity(
  teamId: string,
  difficulty: Difficulty,
): TacticalIdentity {
  const base = identityOf(teamId)
  const edge = DIFFICULTY_EDGE[difficulty]
  const shift = (v: number) => Math.max(0, Math.min(1, v + (v - 0.5) * edge * 2))
  return {
    ...base,
    pressHeight: shift(base.pressHeight),
    tempo: shift(base.tempo),
    risk: shift(base.risk),
    line: shift(base.line),
    aggression: shift(base.aggression),
  }
}

/**
 * Which nations you can be drawn against, by difficulty.
 *
 * Easy gives you the lower half of the seeding, hard gives you the top half,
 * and normal draws from everyone — so raising the difficulty changes who turns
 * up as well as how well they play.
 */
export function opponentPool(homeTeamId: string, difficulty: Difficulty): string[] {
  const others = TEAM_IDS.filter((id) => id !== homeTeamId)
  const ranked = [...others].sort((a, b) => teamStrength(b) - teamStrength(a))
  if (difficulty === 'easy') return ranked.slice(Math.floor(ranked.length / 2))
  if (difficulty === 'hard') return ranked.slice(0, Math.ceil(ranked.length / 2))
  return ranked
}

export function drawOpponent(homeTeamId: string, difficulty: Difficulty): string {
  const pool = opponentPool(homeTeamId, difficulty)
  return pool[Math.floor(Math.random() * pool.length)] ?? homeTeamId
}

/** Which shape a nation's AI will line up in, biased by difficulty. */
export function opponentFormationId(
  teamId: string,
  difficulty: Difficulty,
): string {
  const [attack, counter, defend] = recommendedFor(teamId)
  // A hard opponent backs itself and comes at you; an easy one sits in.
  const pick =
    difficulty === 'hard' ? attack : difficulty === 'easy' ? defend : counter
  return pick.id
}

/** The modes a briefing can be written for. */
export type BriefingMode = 'match' | 'shootout' | 'tutorial'

export interface Briefing {
  /** "Germany — high press, high line". */
  headline: string
  /** The shape they will line up in. */
  formationName: string
  formationSummary: string
  /** Three to five bullet points. */
  points: string[]
  /** The single sentence to remember. */
  keyPoint: string
  /** Their most dangerous individual. */
  danger: string
}

const DIFFICULTY_NOTE: Record<Difficulty, string> = {
  easy: 'They are taking this one lightly: the press is loose and the line sits deep.',
  normal: 'A full-strength performance. Expect them to play their normal game.',
  hard: 'Everything sharpened. They press higher, move it quicker, and back themselves.',
}

/** The most dangerous player in a nation's squad, with a reason. */
function dangerMan(teamId: string): string {
  const squad = NATION_ROSTERS[teamId] ?? []
  const best = [...squad].sort((a, b) => b.rating - a.rating)[0]
  if (!best) return 'No standout threat.'
  return `${best.name} (${best.number}) — ${best.trait.toLowerCase()}. ${best.bio}`
}

/**
 * Build the scouting report for a fixture. The same opponent reads differently
 * at each difficulty and in each mode, because what you need to know about them
 * genuinely changes.
 */
export function briefingFor(
  teamId: string,
  difficulty: Difficulty,
  mode: BriefingMode,
  formationId?: string,
): Briefing {
  const team = TEAMS[teamId]
  const id = identityOf(teamId)
  const tuned = tunedIdentity(teamId, difficulty)
  const shape = formationById(formationId ?? opponentFormationId(teamId, difficulty))

  if (mode === 'shootout') {
    return {
      headline: `${team?.name ?? teamId} — from twelve yards`,
      formationName: 'Shootout',
      formationSummary: 'Five kicks each, then sudden death.',
      points: [
        `Their takers go for a corner ${Math.round(30 + id.risk * 50)}% of the time — the rest is placed inside the post.`,
        `Their keeper commits early ${Math.round(30 + tuned.aggression * 50)}% of the time, so a slow, central kick can pay.`,
        difficulty === 'hard'
          ? 'The keeper reads your circle late and moves fast. Put it where he cannot reach rather than where he is not.'
          : difficulty === 'easy'
            ? 'The keeper dives early and often. Wait, then roll it the other way.'
            : 'The keeper is honest: right guess usually means a save, corners usually beat him.',
        'Your own circle is small on purpose. Drag it all the way into a corner and the margin disappears.',
      ],
      keyPoint:
        'Overlap of the two circles decides it. A corner is the smallest overlap and the biggest miss risk.',
      danger: dangerMan(teamId),
    }
  }

  if (mode === 'tutorial') {
    return {
      headline: 'Training ground',
      formationName: shape.name,
      formationSummary: shape.summary,
      points: [
        'Nothing here counts. Take as long as you like on each step.',
        'Press Space to move to the next demonstration, Backspace to go back.',
        'Every mechanic you will use in a real match appears at least once.',
      ],
      keyPoint: 'The boards are live: the ball never leaves play, so the game never stops.',
      danger: 'No opposition.',
    }
  }

  const points: string[] = [
    `Shape: ${shape.name}. ${shape.summary}`,
    `Press: ${describePress(tuned.pressHeight)} Defensive line ${describeLine(tuned.line)}.`,
    `On the ball: ${describeTempo(tuned.tempo, tuned.directness)} ${describeWidth(tuned.width)}`,
    `Strengths: ${id.strengths[0].toLowerCase()}, and ${id.strengths[1].toLowerCase()}.`,
    `Weakness: ${id.weakness}`,
    DIFFICULTY_NOTE[difficulty],
  ]

  return {
    headline: `${team?.name ?? teamId} — ${id.label.toLowerCase()}`,
    formationName: shape.name,
    formationSummary: shape.summary,
    points,
    keyPoint: id.counter,
    danger: dangerMan(teamId),
  }
}

function describePress(v: number): string {
  if (v > 0.72) return 'They press your keeper and centre-backs from the first whistle.'
  if (v > 0.55) return 'They press once you cross halfway.'
  if (v > 0.4) return 'They hold their shape and press only around the ball.'
  return 'They drop off and let you come to them.'
}

function describeLine(v: number): string {
  if (v > 0.7) return 'is extremely high — the space in behind is enormous'
  if (v > 0.55) return 'is aggressive but covered'
  if (v > 0.4) return 'sits around the edge of their own third'
  return 'sits deep on the edge of the box'
}

function describeTempo(tempo: number, directness: number): string {
  const speed =
    tempo > 0.7 ? 'One and two touches, always forward.' :
    tempo > 0.5 ? 'They move it on quickly without forcing it.' :
    'Slow, deliberate, waiting for you to step out.'
  const route =
    directness > 0.55 ? ' The first look is always the long one.' :
    directness > 0.3 ? ' Mixed short and direct.' :
    ' Everything is played short through the lines.'
  return speed + route
}

function describeWidth(v: number): string {
  if (v > 0.7) return 'Almost all of it comes down the sides.'
  if (v > 0.5) return 'They use the flanks, but the finish comes centrally.'
  return 'They keep it narrow and work the middle.'
}
