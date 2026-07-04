import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { useInputSystem } from "@/game/systems/inputSystem";
import { usePlayerCharacterController } from "@/game/systems/playerControllerSystem";
import { useCameraSystem } from "@/game/systems/cameraSystem";

const { capsuleRadius, capsuleHalfHeight } = PHYSICS_CONFIG.player;

interface PlayerEntityProps {
  color?: string;
  spawnPosition?: [number, number, number];
  /** Whether this entity is currently under player control (camera + keyboard input). */
  controlled?: boolean;
}

/** Low-poly voxel-style character: blocky torso/head/limbs, procedurally animated by speed. */
export function PlayerEntity({
  color = "#1565c0",
  spawnPosition = [0, 1, 0],
  controlled = true,
}: PlayerEntityProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  const readInput = useInputSystem();
  const { update: updateController, yaw } = usePlayerCharacterController(rigidBodyRef);
  const updateCamera = useCameraSystem();

  const animPhase = useRef(0);

  useFrame((_, delta) => {
    const input = controlled
      ? readInput()
      : { moveDirection: new THREE.Vector2(0, 0), sprinting: false };

    const speed = updateController(delta, input);

    // Mirror the physics body's kinematic transform onto the visual model.
    const rigidBody = rigidBodyRef.current;
    const group = modelGroupRef.current;
    if (rigidBody && group) {
      const t = rigidBody.translation();
      const r = rigidBody.rotation();
      group.position.set(t.x, t.y, t.z);
      group.quaternion.set(r.x, r.y, r.z, r.w);
    }

    // Procedural run cycle: leg/arm swing amplitude & rate scale with speed.
    const maxSpeed = PHYSICS_CONFIG.player.sprintSpeed;
    const speedFraction = THREE.MathUtils.clamp(speed / maxSpeed, 0, 1);
    animPhase.current += delta * (4 + speedFraction * 8);
    const swing = Math.sin(animPhase.current) * speedFraction * 0.7;

    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing;

    if (controlled && group) {
      updateCamera(delta, group.position, yaw.current);
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={spawnPosition}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[capsuleHalfHeight, capsuleRadius]} />
      </RigidBody>

      <group ref={modelGroupRef}>
        {/* Torso */}
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.5, 0.6, 0.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh castShadow position={[0, 0.85, 0]}>
          <boxGeometry args={[0.32, 0.32, 0.32]} />
          <meshStandardMaterial color="#f2c299" />
        </mesh>
        {/* Legs */}
        <mesh ref={leftLegRef} castShadow position={[-0.13, -0.05, 0]}>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
        <mesh ref={rightLegRef} castShadow position={[0.13, -0.05, 0]}>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
        {/* Arms */}
        <mesh ref={leftArmRef} castShadow position={[-0.34, 0.4, 0]}>
          <boxGeometry args={[0.16, 0.45, 0.16]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh ref={rightArmRef} castShadow position={[0.34, 0.4, 0]}>
          <boxGeometry args={[0.16, 0.45, 0.16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </>
  );
}
