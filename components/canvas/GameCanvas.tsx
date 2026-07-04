"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { Field } from "@/game/entities/Field";
import { PlayerEntity } from "@/game/entities/PlayerEntity";

export function GameCanvas() {
  return (
    <Canvas camera={{ fov: 55, near: 0.1, far: 300 }}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 40, 10]} intensity={1.2} />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <PlayerEntity color="#1565c0" spawnPosition={[0, 1, 0]} controlled />
      </Physics>
    </Canvas>
  );
}
