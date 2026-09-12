import { useGameStore } from '@/game/state/gameStore'
import GameShell from '@/components/canvas/GameShell'
import { TitleScreen } from '@/components/ui/TitleScreen'
import { TeamSelect } from '@/components/ui/TeamSelect'
import { SquadEditor } from '@/components/ui/SquadEditor'
import { Briefing } from '@/components/ui/Briefing'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  switch (screen) {
    case 'playing':
      return <GameShell />
    case 'briefing':
      return <Briefing />
    case 'squad':
      return <SquadEditor />
    case 'teamSelect':
      return <TeamSelect />
    default:
      return <TitleScreen />
  }
}
