import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";
import { Scoreboard, GoalFlash } from "@/components/ui/Scoreboard";
import { TouchControls } from "@/components/ui/TouchControls";
import {
  FullTimeOverlay,
  ExtraTimeOverlay,
  ShootoutIntroOverlay,
  SettingsMenu,
} from "@/components/ui/MatchOverlays";
import { AudioController } from "@/components/AudioController";
import { useGameStore } from "@/game/state/gameStore";

export default function GameShell() {
  const controlMode = useGameStore((s) => s.controlMode);

  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <AudioController />
      <Scoreboard />
      <GoalFlash />
      <SettingsMenu />
      {controlMode === "keyboard" ? <HUD /> : <TouchControls />}
      <ExtraTimeOverlay />
      <ShootoutIntroOverlay />
      <FullTimeOverlay />
    </div>
  );
}
