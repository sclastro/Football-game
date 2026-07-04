"use client";

import dynamic from "next/dynamic";

const GameShell = dynamic(() => import("@/components/canvas/GameShell"), {
  ssr: false,
});

export default function GameClient() {
  return <GameShell />;
}
