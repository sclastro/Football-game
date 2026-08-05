import { useGameStore } from '@/game/state/gameStore'
import { callState, playerRegistry } from './worldRegistry'
import { pickPlayerAtScreen } from './playerPicking'
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
 * - First tap on a teammate: select them (ring appears, they make a run).
 * - Second tap on the same teammate: take direct control of them.
 * - Tap on the player you already control: clear the selection.
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
