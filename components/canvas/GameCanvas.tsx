"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { Field } from "@/game/entities/Field";
import { Ball } from "@/game/entities/Ball";
import { PlayerEntity } from "@/game/entities/PlayerEntity";

export function GameCanvas() {
  const ballRef = useRef<RapierRigidBody>(null);

  return (
    <Canvas camera={{ fov: 55, near: 0.1, far: 300 }}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30, 40, 10]} intensity={1.2} />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <Ball bodyRef={ballRef} spawnPosition={[0, 0.3, -2]} />
        <PlayerEntity
          color="#1565c0"
          spawnPosition={[0, 1, 0]}
          controlled
          ballRef={ballRef}
        />
      </Physics>
    </Canvas>
  );
}
