import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";
import { Scoreboard, GoalFlash } from "@/components/ui/Scoreboard";

export default function GameShell() {
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <Scoreboard />
      <GoalFlash />
      <HUD />
    </div>
  );
}
