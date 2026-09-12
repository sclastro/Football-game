import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '@/game/state/gameStore'
import { TUTORIAL_STEPS } from '@/game/data/tutorial'
import {
  ballApi,
  clearPass,
  dribbleState,
  playerRegistry,
  type PlayerRecord,
} from './worldRegistry'
import { clearSelection } from './selectionSystem'
import { PHYSICS_CONFIG } from '@/game/physics/physicsConfig'

const BALL_R = PHYSICS_CONFIG.ball.radius

/**
 * Whether the AI is currently frozen for a lesson. Read by the player entities,
 * which is cheaper than threading a prop through every one of them.
 */
export const tutorialState = { frozen: false, active: false }

/** Somewhere far off the pitch to park players a lesson does not need. */
const BENCH_X = 46

/**
 * Stages each tutorial lesson.
 *
 * A lesson is just a scene: the ball goes here, you go there, these opponents
 * stand in front of you, everyone else waits by the touchline. Re-staging on
 * every step means a lesson can always be retried simply by pressing Backspace
 * and then Space again.
 */
export function TutorialDirector() {
  const mode = useGameStore((s) => s.mode)
  const step = useGameStore((s) => s.tutorialStep)
  const staged = useRef(-1)

  // Space and Backspace walk through the lessons. They are bound here rather
  // than in the input system so they exist only while the tutorial is running.
  useEffect(() => {
    if (mode !== 'tutorial') return
    const onKey = (e: KeyboardEvent) => {
      const st = useGameStore.getState()
      if (e.code === 'Space') {
        e.preventDefault()
        st.setTutorialStep(st.tutorialStep + 1)
      } else if (e.code === 'Backspace') {
        e.preventDefault()
        st.setTutorialStep(st.tutorialStep - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  useEffect(() => {
    tutorialState.active = mode === 'tutorial'
    if (mode !== 'tutorial') {
      tutorialState.frozen = false
      staged.current = -1
    }
    return () => {
      tutorialState.active = false
      tutorialState.frozen = false
    }
  }, [mode])

  useFrame(() => {
    if (mode !== 'tutorial') return
    // The registry fills in over the first few frames after a reset, so wait
    // until everyone is present before placing them.
    if (staged.current === step) return
    if (playerRegistry.size < 4 || !ballApi.body) return
    stageStep(step)
    staged.current = step
  })

  return null
}

function place(rec: PlayerRecord, x: number, z: number): void {
  rec.rigidBody?.setTranslation({ x, y: rec.spawn[1], z }, true)
  rec.position.set(x, rec.spawn[1], z)
  rec.knockedUntil = 0
  rec.slide.activeUntil = 0
  rec.slide.readyAt = 0
  rec.slide.chain = 0
  rec.ai.makeRun = false
}

/** Put the world into the shape a lesson wants. */
function stageStep(index: number): void {
  const step = TUTORIAL_STEPS[index]
  if (!step) return
  const st = useGameStore.getState()
  tutorialState.frozen = step.freezeAi

  clearSelection()
  clearPass()
  dribbleState.possessorId = null
  dribbleState.releaseUntil = 0
  dribbleState.protectedUntil = 0

  // Split the squads into the ones this lesson uses and the ones it does not.
  const mates: PlayerRecord[] = []
  const opponents: PlayerRecord[] = []
  let you: PlayerRecord | null = null
  for (const rec of playerRegistry.values()) {
    if (rec.team === 'home') {
      if (!rec.isGoalkeeper && !you) you = rec
      else mates.push(rec)
    } else {
      opponents.push(rec)
    }
  }

  if (you) {
    place(you, step.player[0], step.player[1])
    st.setControlledPlayer(you.id)
  }

  // Keepers always stay in their goal; they are part of every lesson.
  const usableMates = mates.filter((m) => !m.isGoalkeeper)
  const usableOpponents = opponents.filter((o) => !o.isGoalkeeper)
  for (const rec of [...mates, ...opponents]) {
    if (rec.isGoalkeeper) place(rec, 0, rec.spawn[2])
  }

  step.mates.forEach(([x, z], i) => {
    const rec = usableMates[i]
    if (rec) place(rec, x, z)
  })
  step.defenders.forEach(([x, z], i) => {
    const rec = usableOpponents[i]
    if (rec) place(rec, x, z)
  })

  // Everyone the lesson does not need waits off the pitch, well clear of the
  // boards so they cannot wander back in and confuse the demonstration.
  usableMates.slice(step.mates.length).forEach((rec, i) => {
    place(rec, -BENCH_X, -18 + i * 3)
  })
  usableOpponents.slice(step.defenders.length).forEach((rec, i) => {
    place(rec, BENCH_X, -18 + i * 3)
  })

  const body = ballApi.body
  if (body) {
    body.setTranslation({ x: step.ball[0], y: BALL_R + 0.05, z: step.ball[1] }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    const [vx, vz] = step.ballVelocity ?? [0, 0]
    body.setLinvel({ x: vx, y: 0, z: vz }, true)
  }
}
