import { type RefObject } from "react";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";

const { radius, mass, restitution, friction, linearDamping, angularDamping } =
  PHYSICS_CONFIG.ball;

interface BallProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  spawnPosition?: [number, number, number];
}

/** Dynamic football: bounces, rolls and slows to a stop via damping. */
export function Ball({ bodyRef, spawnPosition = [0, radius, 2] }: BallProps) {
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
      ccd
    >
      <BallCollider args={[radius]} />
      <mesh castShadow>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* A couple of dark pentagon-ish patches so spin is visible. */}
      <mesh position={[0, radius * 0.6, 0]}>
        <sphereGeometry args={[radius * 0.5, 6, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </RigidBody>
  );
}
