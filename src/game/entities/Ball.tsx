import { useEffect, useRef } from "react";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { ballApi } from "@/game/systems/worldRegistry";
import { useGameStore } from "@/game/state/gameStore";

const { radius, mass, restitution, friction, linearDamping, angularDamping } =
  PHYSICS_CONFIG.ball;

const KICKOFF_SPOT = { x: 0, y: radius + 0.05, z: 0 };

// Roughly icosahedral patch directions (unit-ish) for the classic panel look.
const BALL_PATCHES: [number, number, number][] = [
  [0, 1, 0],
  [0, -1, 0],
  [0.9, 0.3, 0],
  [-0.9, 0.3, 0],
  [0, 0.3, 0.9],
  [0, 0.3, -0.9],
];

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
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial color="white" roughness={0.55} />
      </mesh>
      {/* Dark facets around the ball so spin and position read clearly. */}
      {BALL_PATCHES.map((p, i) => (
        <mesh key={i} position={[p[0] * radius, p[1] * radius, p[2] * radius]}>
          <sphereGeometry args={[radius * 0.34, 6, 6]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </RigidBody>
  );
}
