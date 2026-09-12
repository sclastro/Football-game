import { useGameStore } from '@/game/state/gameStore'
import { callState, dribbleState, playerRegistry } from './worldRegistry'
import { pickPlayerAtScreen } from './playerPicking'
import { virtualInput } from './virtualInput'
import { audio } from './audio'

/** How long a shout for the ball stays live, in seconds. */
const CALL_DURATION = 3

/**
 * Who the user has currently singled out. A selected teammate breaks into space
 * and is the target of the next PASS. Tapping the same player a second time
 * hands you direct control of them.
 *
 * This is module-level rather than store state so that the per-frame systems can
 * read it without triggering React re-renders; the UI reflects it through the
 * ring drawn under the player, which is toggled inside the render loop.
 */
export const selectionState: { selectedId: string | null; selectedAt: number } = {
  selectedId: null,
  selectedAt: 0,
}

export function clearSelection(): void {
  const prev = selectionState.selectedId
  if (prev) {
    const rec = playerRegistry.get(prev)
    if (rec) rec.ai.makeRun = false
  }
  selectionState.selectedId = null
  selectionState.selectedAt = 0
}

/**
 * Handle a tap on a player.
 *
 * - First tap on a team-mate: select them. A ring spins under them and they
 *   start their run.
 * - Second tap on the same team-mate: if you have the ball, play it to them —
 *   and control moves to them when it arrives. If you do not have the ball,
 *   you simply take them over instead.
 * - Tap on the player you already control: shout for the ball.
 *
 * The second tap carries both meanings because there is no longer a PASS
 * button. Which one you get is never ambiguous: passing the ball requires
 * having the ball.
 */
export function tapPlayer(id: string): void {
  const rec = playerRegistry.get(id)
  if (!rec) return
  // Only your own outfielders can be selected or taken over.
  if (rec.team !== 'home' || rec.isGoalkeeper) return

  const store = useGameStore.getState()
  if (id === store.controlledPlayerId) {
    // Tapping the player you're already driving is a shout for the ball: an AI
    // team-mate carrying it will look to play you in. This is what stops you
    // standing around with no way to get involved.
    callState.byId = id
    callState.untilTime = performance.now() / 1000 + CALL_DURATION
    clearSelection()
    audio.select()
    return
  }

  if (selectionState.selectedId === id) {
    if (dribbleState.possessorId === store.controlledPlayerId) {
      // Keep the selection: the pass needs to know who it is aimed at, and the
      // possession system clears it once the ball has been struck.
      virtualInput.passRequested = true
      return
    }
    clearSelection()
    store.setControlledPlayer(id)
    audio.select()
    return
  }

  clearSelection()
  selectionState.selectedId = id
  selectionState.selectedAt = performance.now() / 1000
  rec.ai.makeRun = true
  audio.select()
}

/**
 * Translate a screen tap into a player tap. Returns true if a player was hit,
 * so callers can tell a meaningful tap from one on empty grass.
 */
export function handleScreenTap(clientX: number, clientY: number): boolean {
  const id = pickPlayerAtScreen(clientX, clientY)
  if (!id) return false
  tapPlayer(id)
  return true
}
