import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { useInputSystem, type InputState } from "@/game/systems/inputSystem";
import { usePlayerCharacterController } from "@/game/systems/playerControllerSystem";
import { useCameraSystem } from "@/game/systems/cameraSystem";
import { tryShoot, tryPass, aiKick } from "@/game/systems/ballPossessionSystem";
import { computeAiInput } from "@/game/systems/aiSystem";
import { useGameStore } from "@/game/state/gameStore";
import {
  ballApi,
  playerRegistry,
  type PlayerRecord,
  type TeamSide,
} from "@/game/systems/worldRegistry";
import { FIELD_DIMENSIONS } from "./Field";

const { capsuleRadius, capsuleHalfHeight } = PHYSICS_CONFIG.player;

// The model group is placed at the capsule centre. Shift the visual meshes down
// so the feet (lowest leg point) line up with the capsule's bottom / the pitch.
const LEG_BOTTOM = -0.3;
const MODEL_Y_OFFSET = -(capsuleHalfHeight + capsuleRadius) - LEG_BOTTOM;

const KICK_DURATION = 0.28; // seconds the kick leg-swing plays for
const AI_KICK_COOLDOWN = 1.1; // seconds between AI kicks
const AI_KICK_POWER = 7;

interface PlayerEntityProps {
  id: string;
  team: TeamSide;
  isGoalkeeper?: boolean;
  color: string;
  /** GK shirts use this instead of the outfield kit colour. */
  gkColor?: string;
  spawnPosition: [number, number, number];
}

/** Low-poly voxel-style character. Human-controlled when the store says so, AI otherwise. */
export function PlayerEntity({
  id,
  team,
  isGoalkeeper = false,
  color,
  gkColor = "#37474f",
  spawnPosition,
}: PlayerEntityProps) {
  const controlled = useGameStore((s) => s.controlledPlayerId) === id;

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  const readInput = useInputSystem();
  const { update: updateController, yaw, reset: resetController } =
    usePlayerCharacterController(rigidBodyRef);
  const updateCamera = useCameraSystem();

  const animPhase = useRef(0);
  const kickTimer = useRef(0);
  const aiKickCooldown = useRef(0);

  // Reusable per-entity buffers (never allocate in useFrame).
  const aiInput = useMemo<InputState>(
    () => ({
      moveDirection: new THREE.Vector2(0, 0),
      sprinting: false,
      shootHeld: false,
      shootCharge: 0,
      shootReleased: false,
      passPressed: false,
    }),
    [],
  );
  const record = useMemo<PlayerRecord>(
    () => ({
      id,
      team,
      isGoalkeeper,
      position: new THREE.Vector3(...spawnPosition),
      spawn: spawnPosition,
      rigidBody: null,
    }),
    // Registry record identity must be stable for this entity's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  const opponentGoal = useMemo(
    () =>
      new THREE.Vector3(
        0,
        0,
        team === "home" ? FIELD_DIMENSIONS.length / 2 : -FIELD_DIMENSIONS.length / 2,
      ),
    [team],
  );
  // Face the opponent goal at kickoff: home attacks +Z (yaw PI), away -Z (yaw 0).
  const kickoffYaw = team === "home" ? Math.PI : 0;

  // Register into the shared world registry.
  useEffect(() => {
    record.rigidBody = rigidBodyRef.current;
    playerRegistry.set(id, record);
    return () => {
      playerRegistry.delete(id);
    };
  }, [id, record]);

  // Teleport back to the kickoff spot whenever a reset is signalled.
  useEffect(() => {
    resetController(kickoffYaw);
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.resetNonce === prev.resetNonce) return;
      const body = rigidBodyRef.current;
      if (!body) return;
      body.setTranslation(
        { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
        true,
      );
      resetController(kickoffYaw);
    });
    return unsub;
    // Spawn/yaw are fixed per entity; subscribe once for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const phase = useGameStore.getState().phase;
    const active = phase === "live";

    let input: InputState;
    if (controlled && active) {
      input = readInput();
    } else if (!controlled && active) {
      input = computeAiInput(record, aiInput);
    } else {
      aiInput.moveDirection.set(0, 0);
      aiInput.sprinting = false;
      input = aiInput;
    }

    const speed = updateController(delta, input);

    // Mirror the physics body's kinematic transform onto the visual model.
    const rigidBody = rigidBodyRef.current;
    const group = modelGroupRef.current;
    if (rigidBody && group) {
      const t = rigidBody.translation();
      const r = rigidBody.rotation();
      group.position.set(t.x, t.y, t.z);
      group.quaternion.set(r.x, r.y, r.z, r.w);
      record.position.set(t.x, t.y, t.z);
      record.rigidBody = rigidBody;
    }

    // Kicking.
    const ball = ballApi.body;
    if (ball && active) {
      if (controlled) {
        if (tryShoot(ball, record.position, yaw.current, input)) {
          kickTimer.current = KICK_DURATION;
        } else if (
          input.passPressed &&
          tryPass(ball, id, record.position, yaw.current)
        ) {
          kickTimer.current = KICK_DURATION;
        }
      } else {
        aiKickCooldown.current = Math.max(0, aiKickCooldown.current - delta);
        if (aiKickCooldown.current === 0) {
          const kicked = aiKick(ball, record.position, opponentGoal, AI_KICK_POWER);
          if (kicked) {
            kickTimer.current = KICK_DURATION;
            aiKickCooldown.current = AI_KICK_COOLDOWN;
          }
        }
      }
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

    // Kick animation: overrides the right leg with a sharp forward swing.
    if (kickTimer.current > 0) {
      kickTimer.current = Math.max(0, kickTimer.current - delta);
      const t = 1 - kickTimer.current / KICK_DURATION;
      const kickSwing = Math.sin(t * Math.PI) * -1.4;
      if (rightLegRef.current) rightLegRef.current.rotation.x = kickSwing;
    }

    if (controlled && group) {
      updateCamera(delta, group.position, yaw.current);
    }
  });

  const shirtColor = isGoalkeeper ? gkColor : color;

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
        <group position={[0, MODEL_Y_OFFSET, 0]}>
          {/* Torso */}
          <mesh castShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.3]} />
            <meshStandardMaterial color={shirtColor} />
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
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh ref={rightArmRef} castShadow position={[0.34, 0.4, 0]}>
            <boxGeometry args={[0.16, 0.45, 0.16]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          {/* Controlled-player marker: small ring at the feet */}
          {controlled && (
            <mesh position={[0, LEG_BOTTOM + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.45, 0.58, 24]} />
              <meshBasicMaterial color="#ffee58" transparent opacity={0.9} />
            </mesh>
          )}
        </group>
      </group>
    </>
  );
}
