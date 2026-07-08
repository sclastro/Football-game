import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Billboard } from "@react-three/drei";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { PLAYER_INFO } from "@/game/data/teams";
import { numberTexture } from "@/game/utils/textures";
import { audio } from "@/game/systems/audio";
import { useInputSystem, type InputState } from "@/game/systems/inputSystem";
import { usePlayerCharacterController } from "@/game/systems/playerControllerSystem";
import { useCameraSystem } from "@/game/systems/cameraSystem";
import { tryShoot, tryPass, aiKick } from "@/game/systems/ballPossessionSystem";
import { computeAiInput, makeAiState } from "@/game/systems/aiSystem";
import { useGameStore } from "@/game/state/gameStore";
import {
  ballApi,
  playerRegistry,
  type PlayerRecord,
  type TeamSide,
} from "@/game/systems/worldRegistry";
import { FIELD_DIMENSIONS } from "./Field";

const { capsuleRadius, capsuleHalfHeight, aiSpeedFactor } = PHYSICS_CONFIG.player;

// The model group is placed at the capsule centre. Shift the visual meshes down
// so the feet (lowest leg point) line up with the capsule's bottom / the pitch.
const LEG_BOTTOM = -0.54;
const MODEL_Y_OFFSET = -(capsuleHalfHeight + capsuleRadius) - LEG_BOTTOM;

const SKIN_TONES = ["#f3c9a0", "#e6b088", "#c98a5e", "#a56a3d", "#8a5a34"];
const HAIR_COLORS = ["#1c1310", "#2b1a0e", "#4a2e12", "#0e0e0e", "#5a4632", "#222"];

/** Deterministic 0..n-1 index from a player id, so a player looks consistent. */
function pick(id: string, n: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % n;
}

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function contrastText(hex: string): string {
  return luminance(hex) > 0.6 ? "#111111" : "#ffffff";
}

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
  const leanRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

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
      yaw: 0,
      spawn: spawnPosition,
      rigidBody: null,
      ai: makeAiState(),
    }),
    // Registry record identity must be stable for this entity's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  // Home attacks -Z (the far goal, up the screen); away attacks +Z.
  const opponentGoal = useMemo(
    () =>
      new THREE.Vector3(
        0,
        0,
        team === "home" ? -FIELD_DIMENSIONS.length / 2 : FIELD_DIMENSIONS.length / 2,
      ),
    [team],
  );
  // Face the attacking goal at kickoff: home faces -Z (yaw 0, matches W), away +Z.
  const kickoffYaw = team === "home" ? 0 : Math.PI;

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

    const speedScale = controlled ? 1 : record.ai.speed * aiSpeedFactor;
    const speed = updateController(delta, input, speedScale);

    // Mirror the physics body's kinematic transform onto the visual model.
    const rigidBody = rigidBodyRef.current;
    const group = modelGroupRef.current;
    if (rigidBody && group) {
      const t = rigidBody.translation();
      const r = rigidBody.rotation();
      group.position.set(t.x, t.y, t.z);
      group.quaternion.set(r.x, r.y, r.z, r.w);
      record.position.set(t.x, t.y, t.z);
      record.yaw = yaw.current;
      record.rigidBody = rigidBody;
    }

    // Kicking.
    const ball = ballApi.body;
    if (ball && active) {
      if (controlled) {
        if (tryShoot(ball, record.position, yaw.current, input)) {
          kickTimer.current = KICK_DURATION;
          audio.kick();
        } else if (
          input.passPressed &&
          tryPass(ball, id, record.position, yaw.current)
        ) {
          kickTimer.current = KICK_DURATION;
          audio.kick();
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

    if (leftLegRef.current) leftLegRef.current.rotation.set(swing, 0, 0);
    if (rightLegRef.current) rightLegRef.current.rotation.set(-swing, 0, 0);
    if (leftArmRef.current) leftArmRef.current.rotation.set(-swing, 0, 0);
    if (rightArmRef.current) rightArmRef.current.rotation.set(swing, 0, 0);

    // Athletic forward lean while running (model faces -Z, so lean = -rot.x).
    if (leanRef.current) leanRef.current.rotation.x = -speedFraction * 0.18;

    // Kick animation: overrides the right leg with a sharp forward swing.
    if (kickTimer.current > 0) {
      kickTimer.current = Math.max(0, kickTimer.current - delta);
      const t = 1 - kickTimer.current / KICK_DURATION;
      const kickSwing = Math.sin(t * Math.PI) * -1.4;
      if (rightLegRef.current) rightLegRef.current.rotation.x = kickSwing;
    }

    // Goal celebration: the scoring team leaps with arms raised.
    if (
      phase === "goalStoppage" &&
      useGameStore.getState().lastScorer === record.team &&
      group
    ) {
      const tsec = performance.now() / 1000;
      group.position.y += Math.abs(Math.sin(tsec * 6)) * 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, 2.5);
      if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, -2.5);
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
    }

    if (controlled && group) {
      updateCamera(delta, group.position);
    }
  });

  const shirtColor = isGoalkeeper ? gkColor : color;
  const shortsColor = luminance(shirtColor) > 0.62 ? "#1b2536" : "#f4f4f4";
  const sockColor = shirtColor;
  const skinTone = SKIN_TONES[pick(id, SKIN_TONES.length)];
  const hairColor = HAIR_COLORS[pick(id + "h", HAIR_COLORS.length)];
  const number = PLAYER_INFO[id]?.number ?? 0;
  const numberTex = useMemo(
    () => numberTexture(number, shirtColor, contrastText(shirtColor)),
    [number, shirtColor],
  );

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
        <group ref={leanRef} position={[0, MODEL_Y_OFFSET, 0]}>
          {/* Shorts */}
          <mesh castShadow position={[0, 0.08, 0]}>
            <boxGeometry args={[0.52, 0.22, 0.32]} />
            <meshStandardMaterial color={shortsColor} />
          </mesh>
          {/* Torso */}
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.5, 0.56, 0.3]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          {/* Number on the shirt back (+Z is the back; player faces -Z) */}
          <mesh position={[0, 0.46, 0.161]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial map={numberTex} transparent />
          </mesh>
          {/* Neck + head */}
          <mesh position={[0, 0.74, 0]}>
            <boxGeometry args={[0.16, 0.1, 0.16]} />
            <meshStandardMaterial color={skinTone} />
          </mesh>
          <mesh castShadow position={[0, 0.9, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={skinTone} />
          </mesh>
          {/* Hair cap */}
          <mesh castShadow position={[0, 1.02, -0.02]}>
            <boxGeometry args={[0.32, 0.12, 0.33]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          {/* Eyes (front face = -Z) */}
          <mesh position={[-0.07, 0.92, -0.151]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          <mesh position={[0.07, 0.92, -0.151]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          {/* Legs: thigh (skin/short) + sock */}
          <group ref={leftLegRef} position={[-0.13, 0.0, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <boxGeometry args={[0.17, 0.28, 0.17]} />
              <meshStandardMaterial color={skinTone} />
            </mesh>
            <mesh castShadow position={[0, -0.42, 0]}>
              <boxGeometry args={[0.17, 0.24, 0.18]} />
              <meshStandardMaterial color={sockColor} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.13, 0.0, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <boxGeometry args={[0.17, 0.28, 0.17]} />
              <meshStandardMaterial color={skinTone} />
            </mesh>
            <mesh castShadow position={[0, -0.42, 0]}>
              <boxGeometry args={[0.17, 0.24, 0.18]} />
              <meshStandardMaterial color={sockColor} />
            </mesh>
          </group>
          {/* Arms: short sleeve (shirt) + forearm (skin) */}
          <group ref={leftArmRef} position={[-0.34, 0.62, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <boxGeometry args={[0.15, 0.24, 0.16]} />
              <meshStandardMaterial color={shirtColor} />
            </mesh>
            <mesh castShadow position={[0, -0.34, 0]}>
              <boxGeometry args={[0.13, 0.22, 0.14]} />
              <meshStandardMaterial color={skinTone} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[0.34, 0.62, 0]}>
            <mesh castShadow position={[0, -0.12, 0]}>
              <boxGeometry args={[0.15, 0.24, 0.16]} />
              <meshStandardMaterial color={shirtColor} />
            </mesh>
            <mesh castShadow position={[0, -0.34, 0]}>
              <boxGeometry args={[0.13, 0.22, 0.14]} />
              <meshStandardMaterial color={skinTone} />
            </mesh>
          </group>
          {/* Controlled-player marker: glowing ring at the feet */}
          {controlled && (
            <mesh position={[0, LEG_BOTTOM + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.42, 0.56, 28]} />
              <meshBasicMaterial color="#ffee58" transparent opacity={0.9} />
            </mesh>
          )}
          {/* Floating number tag so players read clearly from the high camera */}
          <Billboard position={[0, 1.5, 0]}>
            <mesh>
              <planeGeometry args={[0.42, 0.42]} />
              <meshBasicMaterial map={numberTex} transparent />
            </mesh>
          </Billboard>
        </group>
      </group>
    </>
  );
}
