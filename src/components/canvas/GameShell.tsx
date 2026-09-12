import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";
import { Scoreboard, GoalFlash } from "@/components/ui/Scoreboard";
import { TouchControls } from "@/components/ui/TouchControls";
import { ShootoutOverlay } from "@/components/ui/ShootoutOverlay";
import { EntranceOverlay } from "@/components/ui/EntranceOverlay";
import { TutorialOverlay } from "@/components/ui/TutorialOverlay";
import {
  FullTimeOverlay,
  ExtraTimeOverlay,
  ShootoutIntroOverlay,
  SettingsMenu,
} from "@/components/ui/MatchOverlays";
import { AudioController } from "@/components/AudioController";
import { useGameStore } from "@/game/state/gameStore";
import { isPlayingPhase } from "@/game/state/types";

export default function GameShell() {
  const controlMode = useGameStore((s) => s.controlMode);
  const phase = useGameStore((s) => s.phase);

  // The controls cover the whole screen to catch taps, so they only mount while
  // the ball is actually in play — otherwise they sit over the entrance and
  // shootout buttons.
  const showControls = isPlayingPhase(phase) || phase === "goalStoppage";

  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <AudioController />
      <Scoreboard />
      <GoalFlash />
      <SettingsMenu />
      {showControls &&
        (controlMode === "keyboard" ? <HUD /> : <TouchControls />)}
      <EntranceOverlay />
      <TutorialOverlay />
      <ExtraTimeOverlay />
      <ShootoutIntroOverlay />
      <ShootoutOverlay />
      <FullTimeOverlay />
    </div>
  );
}
