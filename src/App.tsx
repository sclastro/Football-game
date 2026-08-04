import { useGameStore } from '@/game/state/gameStore'
import GameShell from '@/components/canvas/GameShell'
import { TitleScreen } from '@/components/ui/TitleScreen'
import { TeamSelect } from '@/components/ui/TeamSelect'
import { SquadSelect } from '@/components/ui/SquadSelect'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  switch (screen) {
    case 'playing':
      return <GameShell />
    case 'squadSelect':
      return <SquadSelect />
    case 'teamSelect':
      return <TeamSelect />
    default:
      return <TitleScreen />
  }
}
