import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";
import { Scoreboard, GoalFlash } from "@/components/ui/Scoreboard";
import { TouchControls } from "@/components/ui/TouchControls";
import { FullTimeOverlay, SettingsMenu } from "@/components/ui/MatchOverlays";
import { useGameStore } from "@/game/state/gameStore";

export default function GameShell() {
  const controlMode = useGameStore((s) => s.controlMode);

  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <Scoreboard />
      <GoalFlash />
      <SettingsMenu />
      {controlMode === "keyboard" ? <HUD /> : <TouchControls />}
      <FullTimeOverlay />
    </div>
  );
}
