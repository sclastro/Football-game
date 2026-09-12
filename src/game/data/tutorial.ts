import { FIELD_DIMENSIONS } from '@/game/entities/Field'

const HALF_W = FIELD_DIMENSIONS.width / 2
const HALF_L = FIELD_DIMENSIONS.length / 2

export interface TutorialStep {
  /** Short heading on the caption card. */
  title: string
  /** Two or three sentences explaining what to do. */
  body: string
  /** The control being taught, shown as a chip. */
  control: string
  /** Where your player starts this lesson. */
  player: [number, number]
  /** Where the ball starts. */
  ball: [number, number]
  /**
   * Optional kick given to the ball the instant the step loads — used to show
   * something happening on its own, like a rebound off the boards.
   */
  ballVelocity?: [number, number]
  /** Opponents dropped in for this lesson, in world coordinates. */
  defenders: [number, number][]
  /** Team-mates dropped in for this lesson. */
  mates: [number, number][]
  /** Freeze everyone who is not you, so the lesson stays still. */
  freezeAi: boolean
}

/**
 * The training ground, one lesson per screen. Space moves forward, Backspace
 * goes back, and every step re-places the ball and the players so a lesson can
 * always be retried from the top.
 *
 * Home attacks -Z, so "forward" for the user is toward negative Z.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Moving',
    body: 'Drag the left stick, or use WASD, to run. Hold SPRINT to break away — you accelerate faster than you stop, so plan the turn before you make it.',
    control: 'Left stick / WASD',
    player: [0, 18],
    ball: [0, 14],
    defenders: [],
    mates: [],
    freezeAi: true,
  },
  {
    title: 'The ball never goes out',
    body: 'There are no throw-ins, corners or goal kicks here. The boards run along every line, so a ball that would have gone out rebounds back into play. Watch it come off the touchline, then go and collect it.',
    control: 'Nothing — just watch',
    player: [-6, 10],
    ball: [-14, 10],
    ballVelocity: [-16, 2],
    defenders: [],
    mates: [],
    freezeAi: true,
  },
  {
    title: 'Shooting',
    body: 'Hold the SHOOT circle and drag. The arrow on the pitch shows exactly how far the ball will travel — the drag sets power only. The ball always goes where your player is facing, so turn first, then pull.',
    control: 'SHOOT — drag for power',
    player: [0, -22],
    ball: [0, -23],
    defenders: [],
    mates: [],
    freezeAi: true,
  },
  {
    title: 'Every shot stays down',
    body: 'Nothing is lofted. A full-power strike runs about thirty metres along the ground, and anything from beyond that loses both power and accuracy. Getting close enough to the goal is half the job.',
    control: 'SHOOT — from range',
    player: [8, -14],
    ball: [8, -15],
    defenders: [],
    mates: [],
    freezeAi: true,
  },
  {
    title: 'Passing',
    body: 'Tap a team-mate: a ring spins under them and they start their run. Tap the same player again and the ball is played to them — and you become them. The old player goes back to the computer.',
    control: 'Tap a team-mate, tap again',
    player: [-4, 6],
    ball: [-4, 5],
    defenders: [],
    mates: [
      [8, -2],
      [-12, -4],
    ],
    freezeAi: true,
  },
  {
    title: 'Passes can be cut out',
    body: 'The ball travels along the ground, so anyone standing in the lane can reach it. Look for the gap before you tap: a pass through two defenders is usually a pass to the other team.',
    control: 'Tap a team-mate, tap again',
    player: [-6, 6],
    ball: [-6, 5],
    defenders: [
      [0, 0],
      [2, -3],
    ],
    mates: [[6, -8]],
    freezeAi: true,
  },
  {
    title: 'Rainbow flick',
    body: 'With the ball at your feet, press FLICK to scoop it over your own head and past whoever is in front of you. It beats a defender standing still; it will not beat one running at you from the side.',
    control: 'FLICK',
    player: [0, 4],
    ball: [0, 3],
    defenders: [[0, -1.6]],
    mates: [],
    freezeAi: true,
  },
  {
    title: 'Sliding in',
    body: 'SLIDE takes the ball off a carrier and knocks them down for a moment — no cards, no free kicks. Slide at someone who has not got the ball and nothing happens at all. You get three slides in a row, then you have to wait.',
    control: 'SLIDE',
    player: [0, 6],
    ball: [0, -1],
    defenders: [[0, -2]],
    mates: [],
    freezeAi: false,
  },
  {
    title: 'Switching players',
    body: 'You always control the man with the red dot above him. The moment the other side plays a pass, you switch automatically to whoever is closest to the receiver — so be ready to move the instant the ball leaves their foot.',
    control: 'Automatic',
    player: [4, 12],
    ball: [-8, 6],
    defenders: [
      [-8, 5],
      [6, -2],
    ],
    mates: [[0, 8]],
    freezeAi: false,
  },
  {
    title: 'Put one in',
    body: 'That is everything. Run at the goal, get inside thirty metres, and finish. When you are done, back out to the menu and pick a nation.',
    control: 'Everything at once',
    player: [0, -10],
    ball: [0, -11],
    defenders: [[2, -26]],
    mates: [],
    freezeAi: false,
  },
]

/** Clamp a tutorial coordinate to the field of play. */
export function insidePitch(x: number, z: number): [number, number] {
  return [
    Math.max(-HALF_W + 1, Math.min(HALF_W - 1, x)),
    Math.max(-HALF_L + 1, Math.min(HALF_L - 1, z)),
  ]
}
