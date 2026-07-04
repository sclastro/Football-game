"use client";

import { GameCanvas } from "@/components/canvas/GameCanvas";
import { HUD } from "@/components/ui/HUD";

export default function GameShell() {
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <HUD />
    </div>
  );
}
