import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Billboard, RoundedBox } from "@react-three/drei";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { PLAYER_INFO } from "@/game/data/rosters";
import { numberTexture } from "@/game/utils/textures";
import { audio } from "@/game/systems/audio";
import { useInputSystem, type InputState } from "@/game/systems/inputSystem";
import { usePlayerCharacterController } from "@/game/systems/playerControllerSystem";
import {
  tryShoot,
  tryPass,
  tryPassTo,
  aiKick,
  choosePassReceiver,
} from "@/game/systems/ballPossessionSystem";
import { selectionState, clearSelection } from "@/game/systems/selectionSystem";
import { isPlayingPhase } from "@/game/state/types";
import { computeAiInput, makeAiState } from "@/game/systems/aiSystem";
import { useGameStore } from "@/game/state/gameStore";
import {
  ballApi,
  clearPass,
  dribbleState,
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
  /** Trim colour for collar/cuffs (team accent). */
  accentColor?: string;
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
  accentColor = "#ffffff",
  gkColor = "#37474f",
  spawnPosition,
}: PlayerEntityProps) {
  const controlled = useGameStore((s) => s.controlledPlayerId) === id;

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);
  const leanRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const readInput = useInputSystem();
  const { update: updateController, yaw, reset: resetController } =
    usePlayerCharacterController(rigidBodyRef);

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
      hasShootAim: false,
      shootAimX: 0,
      shootAimZ: 0,
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
      // A restart voids any selection or pass that was in flight.
      clearSelection();
      clearPass();
    });
    return unsub;
    // Spawn/yaw are fixed per entity; subscribe once for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const phase = useGameStore.getState().phase;
    const active = isPlayingPhase(phase);

    // Selection ring: driven here rather than through React so that tapping a
    // team-mate never re-renders the scene graph mid-match.
    const ring = selectRingRef.current;
    if (ring) {
      const isSelected = selectionState.selectedId === id;
      ring.visible = isSelected;
      if (isSelected) {
        ring.rotation.z += delta * 2.4;
        const pulse = 0.75 + Math.sin(performance.now() / 160) * 0.25;
        (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

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
        if (tryShoot(ball, id, record.position, yaw.current, input)) {
          kickTimer.current = KICK_DURATION;
          audio.kick();
        } else if (input.passPressed) {
          // PASS always goes to the team-mate you singled out, if you picked
          // one. With nobody selected it falls back to the best option in front.
          const picked = selectionState.selectedId
            ? playerRegistry.get(selectionState.selectedId)
            : null;
          const struck =
            picked && picked.id !== id
              ? tryPassTo(ball, id, record.position, picked, true)
              : tryPass(ball, id, record.position, yaw.current, true);
          if (struck) {
            kickTimer.current = KICK_DURATION;
            audio.pass();
          }
        }
      } else {
        aiKickCooldown.current = Math.max(0, aiKickCooldown.current - delta);
        const possessorId = dribbleState.possessorId;
        const possessorRec = possessorId ? playerRegistry.get(possessorId) : null;
        const teammateHasBall =
          !!possessorRec && possessorRec.team === team && possessorId !== id;

        // Discipline: NEVER kick a ball a teammate is carrying (this was what
        // made the ball randomly fly off the user's feet).
        if (!teammateHasBall && aiKickCooldown.current === 0) {
          let kicked = false;

          if (possessorId === id) {
            // I'm carrying: shoot when in range, occasionally lay a pass to a
            // teammate, otherwise keep dribbling (movement handles it).
            const distToGoal = record.position.distanceTo(opponentGoal);
            if (distToGoal < 15) {
              kicked = aiKick(ball, record.position, opponentGoal, 8.5);
            } else if (Math.random() < 0.35) {
              const receiver = choosePassReceiver(id, record.position, yaw.current);
              // byUser = false: an AI team-mate passing must never yank control
              // away from the player you're driving.
              if (receiver) {
                kicked = tryPassTo(ball, id, record.position, receiver, false);
              }
            }
          } else if (possessorRec && possessorRec.team !== team) {
            // Opponent is carrying: tackle — poke the ball away, not a punt.
            kicked = aiKick(ball, record.position, opponentGoal, 4);
          } else {
            // Loose ball: clear/advance it toward the attacking end.
            kicked = aiKick(ball, record.position, opponentGoal, AI_KICK_POWER);
          }

          if (kicked) {
            kickTimer.current = KICK_DURATION;
            aiKickCooldown.current = AI_KICK_COOLDOWN + Math.random() * 0.6;
          } else {
            aiKickCooldown.current = 0.15; // re-evaluate shortly
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

      <group ref={modelGroupRef} position={spawnPosition}>
        <group ref={leanRef} position={[0, MODEL_Y_OFFSET, 0]}>
          {/* Shorts */}
          <RoundedBox castShadow args={[0.52, 0.22, 0.32]} radius={0.05} smoothness={2} position={[0, 0.08, 0]}>
            <meshStandardMaterial color={shortsColor} roughness={0.8} />
          </RoundedBox>
          {/* Torso */}
          <RoundedBox castShadow args={[0.5, 0.56, 0.3]} radius={0.07} smoothness={2} position={[0, 0.42, 0]}>
            <meshStandardMaterial color={shirtColor} roughness={0.75} />
          </RoundedBox>
          {/* Collar trim in the team accent colour */}
          <RoundedBox args={[0.46, 0.06, 0.27]} radius={0.03} smoothness={2} position={[0, 0.68, 0]}>
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </RoundedBox>
          {/* Number on the shirt back (+Z is the back; player faces -Z) */}
          <mesh position={[0, 0.46, 0.165]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial map={numberTex} transparent />
          </mesh>
          {/* Neck + head */}
          <mesh position={[0, 0.74, 0]}>
            <boxGeometry args={[0.16, 0.1, 0.16]} />
            <meshStandardMaterial color={skinTone} />
          </mesh>
          <RoundedBox castShadow args={[0.3, 0.3, 0.3]} radius={0.06} smoothness={2} position={[0, 0.9, 0]}>
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </RoundedBox>
          {/* Hair cap */}
          <RoundedBox castShadow args={[0.32, 0.13, 0.33]} radius={0.05} smoothness={2} position={[0, 1.02, -0.02]}>
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </RoundedBox>
          {/* Eyes (front face = -Z) */}
          <mesh position={[-0.07, 0.92, -0.152]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          <mesh position={[0.07, 0.92, -0.152]}>
            <boxGeometry args={[0.05, 0.05, 0.02]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          {/* Legs: thigh (skin) + sock + boot */}
          <group ref={leftLegRef} position={[-0.13, 0.0, 0]}>
            <RoundedBox castShadow args={[0.17, 0.28, 0.17]} radius={0.04} smoothness={2} position={[0, -0.18, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.17, 0.2, 0.18]} radius={0.04} smoothness={2} position={[0, -0.4, 0]}>
              <meshStandardMaterial color={sockColor} roughness={0.8} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.18, 0.09, 0.24]} radius={0.03} smoothness={2} position={[0, -0.5, -0.03]}>
              <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.1} />
            </RoundedBox>
          </group>
          <group ref={rightLegRef} position={[0.13, 0.0, 0]}>
            <RoundedBox castShadow args={[0.17, 0.28, 0.17]} radius={0.04} smoothness={2} position={[0, -0.18, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.17, 0.2, 0.18]} radius={0.04} smoothness={2} position={[0, -0.4, 0]}>
              <meshStandardMaterial color={sockColor} roughness={0.8} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.18, 0.09, 0.24]} radius={0.03} smoothness={2} position={[0, -0.5, -0.03]}>
              <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.1} />
            </RoundedBox>
          </group>
          {/* Arms: sleeve (shirt + accent cuff) + forearm (skin) */}
          <group ref={leftArmRef} position={[-0.34, 0.62, 0]}>
            <RoundedBox castShadow args={[0.15, 0.24, 0.16]} radius={0.04} smoothness={2} position={[0, -0.12, 0]}>
              <meshStandardMaterial color={shirtColor} roughness={0.75} />
            </RoundedBox>
            <RoundedBox args={[0.155, 0.05, 0.165]} radius={0.02} smoothness={2} position={[0, -0.235, 0]}>
              <meshStandardMaterial color={accentColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.13, 0.22, 0.14]} radius={0.04} smoothness={2} position={[0, -0.36, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </RoundedBox>
          </group>
          <group ref={rightArmRef} position={[0.34, 0.62, 0]}>
            <RoundedBox castShadow args={[0.15, 0.24, 0.16]} radius={0.04} smoothness={2} position={[0, -0.12, 0]}>
              <meshStandardMaterial color={shirtColor} roughness={0.75} />
            </RoundedBox>
            <RoundedBox args={[0.155, 0.05, 0.165]} radius={0.02} smoothness={2} position={[0, -0.235, 0]}>
              <meshStandardMaterial color={accentColor} roughness={0.7} />
            </RoundedBox>
            <RoundedBox castShadow args={[0.13, 0.22, 0.14]} radius={0.04} smoothness={2} position={[0, -0.36, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </RoundedBox>
          </group>
          {/* Controlled-player marker: solid yellow ring at the feet */}
          {controlled && (
            <mesh position={[0, LEG_BOTTOM + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.42, 0.56, 28]} />
              <meshBasicMaterial color="#ffee58" transparent opacity={0.9} />
            </mesh>
          )}
          {/* Selected team-mate marker: a cyan ring that spins and pulses.
              Visibility is toggled in the frame loop, not by React. */}
          <mesh
            ref={selectRingRef}
            visible={false}
            position={[0, LEG_BOTTOM + 0.03, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.6, 0.82, 32, 1, 0, Math.PI * 1.5]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
          </mesh>
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
