import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";
import { Scoreboard, GoalFlash } from "@/components/ui/Scoreboard";
import { SubPanel } from "@/components/ui/SubPanel";

export default function GameShell() {
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <Scoreboard />
      <GoalFlash />
      <HUD />
      <SubPanel />
    </div>
  );
}
