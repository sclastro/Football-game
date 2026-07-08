import { useGameStore } from '@/game/state/gameStore'
import GameShell from '@/components/canvas/GameShell'
import { StartMenu } from '@/components/ui/StartMenu'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  return screen === 'playing' ? <GameShell /> : <StartMenu />
}
