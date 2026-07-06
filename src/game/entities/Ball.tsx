import { useEffect, useRef } from "react";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { ballApi } from "@/game/systems/worldRegistry";
import { useGameStore } from "@/game/state/gameStore";

const { radius, mass, restitution, friction, linearDamping, angularDamping } =
  PHYSICS_CONFIG.ball;

const KICKOFF_SPOT = { x: 0, y: radius + 0.05, z: 0 };

/**
 * Dynamic football: bounces, rolls and slows to a stop via damping.
 * Registers itself into the world registry and returns to the centre spot
 * whenever a kickoff reset is signalled.
 */
export function Ball({
  spawnPosition = [0, radius + 0.05, 2],
}: {
  spawnPosition?: [number, number, number];
}) {
  const bodyRef = useRef<RapierRigidBody>(null);

  useEffect(() => {
    ballApi.body = bodyRef.current;
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.resetNonce === prev.resetNonce) return;
      const body = bodyRef.current;
      if (!body) return;
      body.setTranslation(KICKOFF_SPOT, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
    return () => {
      unsub();
      ballApi.body = null;
    };
  }, []);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={spawnPosition}
      mass={mass}
      restitution={restitution}
      friction={friction}
      linearDamping={linearDamping}
      angularDamping={angularDamping}
      userData={{ type: "ball" }}
      ccd
    >
      <BallCollider args={[radius]} />
      <mesh castShadow>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* A dark patch so spin is visible. */}
      <mesh position={[0, radius * 0.6, 0]}>
        <sphereGeometry args={[radius * 0.5, 6, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </RigidBody>
  );
}
