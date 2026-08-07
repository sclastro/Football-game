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
  horizontalDistanceToBall,
  distanceToAttackingGoal,
} from "@/game/systems/ballPossessionSystem";
import { selectionState, clearSelection } from "@/game/systems/selectionSystem";
import { aimState } from "@/game/systems/aimPreview";
import { virtualInput } from "@/game/systems/virtualInput";
import {
  computeEntranceInput,
  entranceElapsed,
} from "@/game/systems/entranceSystem";
import { isPlayingPhase, type PlayerPosition } from "@/game/state/types";
import {
  computeAiInput,
  computeAiKick,
  makeAiState,
  aiSpeedFactorNow,
  AI_KICK_COOLDOWN,
} from "@/game/systems/aiSystem";
import {
  applyCelebration,
  applyTeammateCheer,
  pickCelebration,
  type CelebrationRefs,
} from "@/game/systems/celebrations";
import { useGameStore, GOAL_FLASH_DURATION } from "@/game/state/gameStore";
import { speedMultiplier } from "@/game/data/teamStrength";
import {
  applyKickPose,
  KICK_DURATIONS,
  type KickKind,
  type KickRefs,
} from "@/game/systems/kickAnimation";
import {
  ballApi,
  callState,
  clearPass,
  dribbleState,
  playerRegistry,
  type PlayerRecord,
  type TeamSide,
} from "@/game/systems/worldRegistry";

const { capsuleRadius, capsuleHalfHeight } = PHYSICS_CONFIG.player;

// The model group is placed at the capsule centre. Shift the visual meshes down
// so the feet (lowest leg point) line up with the capsule's bottom / the pitch.
const LEG_BOTTOM = -0.58;
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

/** You can aim from a little further out than you can actually strike. */
const AIM_SHOW_RANGE = PHYSICS_CONFIG.ball.kickRange * 1.8;

/**
 * Publish the current aim so the on-pitch indicator can draw it. Power comes
 * from the drag length on touch, or from how long Space has been held on
 * keyboard; direction comes from the touch stick when it's being dragged,
 * otherwise from the way the player is facing.
 */
function updateAim(
  ball: RapierRigidBody,
  rec: PlayerRecord,
  yaw: number,
  input: InputState,
): void {
  const playerPos = rec.position;
  const touchAiming = virtualInput.shootHeld;
  if (!touchAiming && !input.shootHeld) {
    aimState.active = false;
    return;
  }
  if (horizontalDistanceToBall(playerPos, ball) > AIM_SHOW_RANGE) {
    aimState.active = false;
    return;
  }

  let dx: number;
  let dz: number;
  const ax = virtualInput.shootAimX;
  const ay = virtualInput.shootAimY;
  if (touchAiming && Math.hypot(ax, ay) > 0.05) {
    // Same screen→world mapping the input system uses when the shot fires.
    const len = Math.hypot(ay, ax) || 1;
    dx = ay / len;
    dz = -ax / len;
  } else {
    dx = -Math.sin(yaw);
    dz = -Math.cos(yaw);
  }

  const t = ball.translation();
  aimState.active = true;
  aimState.power = touchAiming
    ? virtualInput.shootPower
    : THREE.MathUtils.clamp(input.shootCharge / PHYSICS_CONFIG.ball.maxChargeTime, 0, 1);
  aimState.dirX = dx;
  aimState.dirZ = dz;
  aimState.originX = t.x;
  aimState.originY = t.y;
  aimState.originZ = t.z;
  aimState.distanceToGoal = distanceToAttackingGoal(rec);
}

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
  /** Formation slot index, used for the entrance line-up ordering. */
  slotIndex: number;
  /** Formation role, which decides how far up and back this player roams. */
  role: PlayerPosition;
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
  slotIndex,
  role,
}: PlayerEntityProps) {
  const controlled = useGameStore((s) => s.controlledPlayerId) === id;

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);
  const leanRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftShinRef = useRef<THREE.Group>(null);
  const rightShinRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForeRef = useRef<THREE.Group>(null);
  const rightForeRef = useRef<THREE.Group>(null);

  const readInput = useInputSystem();
  const { update: updateController, yaw, reset: resetController } =
    usePlayerCharacterController(rigidBodyRef);

  const animPhase = useRef(0);
  const kickTimer = useRef(0);
  const kickKind = useRef<KickKind>("shot");
  /** Set once per reception so the trap plays a single time, not every frame. */
  const trappedFor = useRef(0);
  const aiKickCooldown = useRef(0);
  /** Latched at the moment of a goal: this player performs the big routine. */
  const scoringLead = useRef(false);
  const kickRefs = useMemo<KickRefs>(
    () => ({
      lean: null,
      leftLeg: null,
      rightLeg: null,
      leftShin: null,
      rightShin: null,
      leftArm: null,
      rightArm: null,
    }),
    [],
  );
  const celebRefs = useMemo<CelebrationRefs>(
    () => ({
      group: null,
      lean: null,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
    }),
    [],
  );

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
      role,
      isGoalkeeper,
      position: new THREE.Vector3(...spawnPosition),
      yaw: 0,
      spawn: spawnPosition,
      slotIndex,
      rigidBody: null,
      ai: makeAiState(),
    }),
    // Registry record identity must be stable for this entity's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
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
      // A restart voids any selection, shout or pass that was in flight.
      clearSelection();
      clearPass();
      callState.byId = null;
      callState.untilTime = 0;
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
    if (phase === "entrance") {
      // Everyone walks out, including the player you'll be controlling.
      input = computeEntranceInput(record, aiInput, entranceElapsed());
    } else if (controlled && active) {
      input = readInput();
    } else if (!controlled && active) {
      input = computeAiInput(record, aiInput);
    } else {
      aiInput.moveDirection.set(0, 0);
      aiInput.sprinting = false;
      input = aiInput;
    }

    // AI pace scales with the chosen difficulty; keepers get a burst mid-dive.
    // A stronger nation is a shade quicker — deliberately only a shade.
    const teamPace = speedMultiplier(
      team === "home"
        ? useGameStore.getState().homeTeamId
        : useGameStore.getState().awayTeamId,
    );
    const speedScale =
      (controlled ? 1 : record.ai.speed * aiSpeedFactorNow() * record.ai.speedBoost) *
      teamPace;
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
        updateAim(ball, record, yaw.current, input);
        if (tryShoot(ball, id, record.position, yaw.current, input)) {
          kickTimer.current = KICK_DURATIONS.shot;
          kickKind.current = "shot";
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
            kickTimer.current = KICK_DURATIONS.pass;
            kickKind.current = "pass";
            audio.pass();
          }
        }
      } else {
        aiKickCooldown.current = Math.max(0, aiKickCooldown.current - delta);
        if (aiKickCooldown.current === 0) {
          const kicked = computeAiKick(
            record,
            (target, power, scatter) =>
              aiKick(ball, id, record.position, target, power, scatter),
            (receiver) => tryPassTo(ball, id, record.position, receiver, false),
          );
          if (kicked) {
            // AI shots and passes both go through computeAiKick; a strike at
            // goal is the long animation, anything else the short one.
            const shooting = distanceToAttackingGoal(record) < 16;
            kickKind.current = shooting ? "shot" : "pass";
            kickTimer.current = KICK_DURATIONS[kickKind.current];
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

    // Knees bend as each leg trails, and elbows stay bent while running — the
    // two details that stop the stride reading as a pair of stiff pendulums.
    const kneeBend = 1.5 * speedFraction;
    if (leftShinRef.current) {
      leftShinRef.current.rotation.x = Math.max(0, -swing) * kneeBend;
    }
    if (rightShinRef.current) {
      rightShinRef.current.rotation.x = Math.max(0, swing) * kneeBend;
    }
    const elbow = -0.25 - speedFraction * 0.8;
    if (leftForeRef.current) leftForeRef.current.rotation.x = elbow;
    if (rightForeRef.current) rightForeRef.current.rotation.x = elbow;

    // Athletic forward lean while running (model faces -Z, so lean = -rot.x).
    // Y is reset here because the kick poses rotate the torso and would
    // otherwise leave the player permanently twisted.
    if (leanRef.current) {
      leanRef.current.rotation.x = -speedFraction * 0.18;
      leanRef.current.rotation.y = 0;
    }

    const nowSec = performance.now() / 1000;

    // Receiving the ball plays a cushioned trap — but only once per reception,
    // otherwise it would restart every frame the protection window is open.
    if (
      active &&
      dribbleState.possessorId === id &&
      nowSec < dribbleState.protectedUntil &&
      trappedFor.current !== dribbleState.possessorSince &&
      kickTimer.current <= 0
    ) {
      trappedFor.current = dribbleState.possessorSince;
      kickKind.current = "trap";
      kickTimer.current = KICK_DURATIONS.trap;
    }

    // Kick / pass / trap poses override the run cycle for their duration.
    if (kickTimer.current > 0) {
      kickTimer.current = Math.max(0, kickTimer.current - delta);
      const total = KICK_DURATIONS[kickKind.current];
      const t = THREE.MathUtils.clamp(1 - kickTimer.current / total, 0, 1);
      kickRefs.lean = leanRef.current;
      kickRefs.leftLeg = leftLegRef.current;
      kickRefs.rightLeg = rightLegRef.current;
      kickRefs.leftShin = leftShinRef.current;
      kickRefs.rightShin = rightShinRef.current;
      kickRefs.leftArm = leftArmRef.current;
      kickRefs.rightArm = rightArmRef.current;
      applyKickPose(kickKind.current, t, kickRefs);
    }

    // Keeper dive: a full-length lateral lunge with the arms stretched out.
    if (record.ai.diveUntil > nowSec) {
      const t = 1 - (record.ai.diveUntil - nowSec) / 0.55;
      const extend = Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5);
      const side = record.ai.diveSide;
      if (leanRef.current) leanRef.current.rotation.z = side * 1.25 * extend;
      if (group) group.position.y -= 0.45 * extend;
      // Both arms reach toward the ball, legs trail behind.
      if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, 2.6 * extend);
      if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, -2.6 * extend);
      if (leftLegRef.current) leftLegRef.current.rotation.set(-0.5 * extend, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0.5 * extend, 0, 0);
      if (leftShinRef.current) leftShinRef.current.rotation.x = 0.3 * extend;
      if (rightShinRef.current) rightShinRef.current.rotation.x = 0.3 * extend;
      if (leftForeRef.current) leftForeRef.current.rotation.x = 0;
      if (rightForeRef.current) rightForeRef.current.rotation.x = 0;
    } else if (leanRef.current) {
      leanRef.current.rotation.z = 0;
    }

    // Goal celebration: the scorer plays their own routine, team-mates cheer.
    if (phase === "goalStoppage") {
      const st = useGameStore.getState();
      if (st.lastScorer === record.team) {
        const elapsed = 1 - (st.goalFlashUntil - nowSec) / GOAL_FLASH_DURATION;
        const t = THREE.MathUtils.clamp(elapsed, 0, 1);
        celebRefs.group = group;
        celebRefs.lean = leanRef.current;
        celebRefs.leftArm = leftArmRef.current;
        celebRefs.rightArm = rightArmRef.current;
        celebRefs.leftLeg = leftLegRef.current;
        celebRefs.rightLeg = rightLegRef.current;
        // Celebration poses are authored at the hip/shoulder, so straighten the
        // knees and elbows out of the run cycle first.
        if (leftShinRef.current) leftShinRef.current.rotation.x = 0;
        if (rightShinRef.current) rightShinRef.current.rotation.x = 0;
        if (leftForeRef.current) leftForeRef.current.rotation.x = -0.15;
        if (rightForeRef.current) rightForeRef.current.rotation.x = -0.15;
        // The player nearest the ball when it went in is treated as the scorer.
        if (dribbleState.possessorId === id || scoringLead.current) {
          scoringLead.current = true;
          applyCelebration(
            pickCelebration(id + st.score.home + "-" + st.score.away),
            t,
            celebRefs,
          );
        } else {
          applyTeammateCheer(t, celebRefs);
        }
      }
    } else {
      scoringLead.current = false;
    }
  });

  const shirtColor = isGoalkeeper ? gkColor : color;
  const shortsColor = luminance(shirtColor) > 0.62 ? "#1b2536" : "#f4f4f4";
  const sockColor = shirtColor;
  const skinTone = SKIN_TONES[pick(id, SKIN_TONES.length)];
  const hairColor = HAIR_COLORS[pick(id + "h", HAIR_COLORS.length)];
  // 0 = short cap, 1 = buzz, 2 = afro, 3 = long
  const hairStyle = pick(id + "hair", 4);
  const hasBeard = pick(id + "beard", 3) === 0;
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
          <RoundedBox castShadow args={[0.5, 0.24, 0.31]} radius={0.05} smoothness={3} position={[0, 0.09, 0]}>
            <meshStandardMaterial color={shortsColor} roughness={0.85} />
          </RoundedBox>
          {/* Shorts trim */}
          <RoundedBox args={[0.505, 0.04, 0.315]} radius={0.02} smoothness={2} position={[0, 0.0, 0]}>
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </RoundedBox>
          {/* Torso — taller and narrower than a plain block reads as a person */}
          <RoundedBox castShadow args={[0.44, 0.42, 0.27]} radius={0.08} smoothness={3} position={[0, 0.41, 0]}>
            <meshStandardMaterial color={shirtColor} roughness={0.78} />
          </RoundedBox>
          {/* Chest / shoulder yoke, wider than the waist */}
          <RoundedBox castShadow args={[0.56, 0.24, 0.29]} radius={0.09} smoothness={3} position={[0, 0.62, 0]}>
            <meshStandardMaterial color={shirtColor} roughness={0.78} />
          </RoundedBox>
          {/* Collar trim in the team accent colour */}
          <RoundedBox args={[0.3, 0.05, 0.26]} radius={0.02} smoothness={2} position={[0, 0.735, 0]}>
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </RoundedBox>
          {/* Number on the back (+Z) and front (-Z); player faces -Z */}
          <mesh position={[0, 0.46, 0.142]}>
            <planeGeometry args={[0.28, 0.28]} />
            <meshBasicMaterial map={numberTex} transparent />
          </mesh>
          <mesh position={[0, 0.6, -0.152]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.15, 0.15]} />
            <meshBasicMaterial map={numberTex} transparent />
          </mesh>
          {/* Neck + head */}
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[0.15, 0.08, 0.15]} />
            <meshStandardMaterial color={skinTone} roughness={0.65} />
          </mesh>
          <RoundedBox castShadow args={[0.28, 0.3, 0.28]} radius={0.07} smoothness={3} position={[0, 0.94, 0]}>
            <meshStandardMaterial color={skinTone} roughness={0.62} />
          </RoundedBox>

          {/* Hair, picked deterministically per player */}
          {hairStyle === 0 && (
            <RoundedBox castShadow args={[0.3, 0.12, 0.31]} radius={0.05} smoothness={3} position={[0, 1.06, -0.01]}>
              <meshStandardMaterial color={hairColor} roughness={0.95} />
            </RoundedBox>
          )}
          {hairStyle === 1 && (
            <RoundedBox castShadow args={[0.285, 0.06, 0.29]} radius={0.03} smoothness={2} position={[0, 1.08, 0]}>
              <meshStandardMaterial color={hairColor} roughness={1} />
            </RoundedBox>
          )}
          {hairStyle === 2 && (
            <RoundedBox castShadow args={[0.36, 0.26, 0.36]} radius={0.12} smoothness={4} position={[0, 1.06, 0]}>
              <meshStandardMaterial color={hairColor} roughness={1} />
            </RoundedBox>
          )}
          {hairStyle === 3 && (
            <>
              <RoundedBox castShadow args={[0.31, 0.14, 0.32]} radius={0.05} smoothness={3} position={[0, 1.05, 0]}>
                <meshStandardMaterial color={hairColor} roughness={0.95} />
              </RoundedBox>
              <RoundedBox castShadow args={[0.26, 0.2, 0.1]} radius={0.04} smoothness={2} position={[0, 0.92, 0.15]}>
                <meshStandardMaterial color={hairColor} roughness={0.95} />
              </RoundedBox>
            </>
          )}
          {hasBeard && (
            <RoundedBox args={[0.24, 0.12, 0.16]} radius={0.04} smoothness={2} position={[0, 0.845, -0.075]}>
              <meshStandardMaterial color={hairColor} roughness={1} />
            </RoundedBox>
          )}

          {/* Face (front is -Z): brow, eyes, nose, mouth */}
          <mesh position={[0, 1.0, -0.135]}>
            <boxGeometry args={[0.2, 0.03, 0.03]} />
            <meshStandardMaterial color={hairColor} roughness={1} />
          </mesh>
          <mesh position={[-0.065, 0.955, -0.142]}>
            <boxGeometry args={[0.05, 0.045, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.065, 0.955, -0.142]}>
            <boxGeometry args={[0.05, 0.045, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.065, 0.953, -0.15]}>
            <boxGeometry args={[0.022, 0.03, 0.012]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          <mesh position={[0.065, 0.953, -0.15]}>
            <boxGeometry args={[0.022, 0.03, 0.012]} />
            <meshBasicMaterial color="#20140c" />
          </mesh>
          <mesh position={[0, 0.915, -0.15]}>
            <boxGeometry args={[0.045, 0.06, 0.035]} />
            <meshStandardMaterial color={skinTone} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.865, -0.142]}>
            <boxGeometry args={[0.07, 0.016, 0.015]} />
            <meshBasicMaterial color="#8a4a44" />
          </mesh>

          {/* Legs: hip → thigh → KNEE → shin/sock → boot.
              The knee joint is what turns a stiff pendulum into a real stride. */}
          <group ref={leftLegRef} position={[-0.12, 0.0, 0]}>
            <RoundedBox castShadow args={[0.17, 0.26, 0.17]} radius={0.05} smoothness={3} position={[0, -0.15, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.62} />
            </RoundedBox>
            <group ref={leftShinRef} position={[0, -0.28, 0]}>
              <RoundedBox castShadow args={[0.16, 0.22, 0.17]} radius={0.045} smoothness={3} position={[0, -0.12, 0]}>
                <meshStandardMaterial color={sockColor} roughness={0.85} />
              </RoundedBox>
              <RoundedBox args={[0.165, 0.04, 0.175]} radius={0.02} smoothness={2} position={[0, -0.02, 0]}>
                <meshStandardMaterial color={accentColor} roughness={0.8} />
              </RoundedBox>
              <RoundedBox castShadow args={[0.17, 0.09, 0.25]} radius={0.035} smoothness={3} position={[0, -0.255, -0.04]}>
                <meshStandardMaterial color="#141414" roughness={0.35} metalness={0.15} />
              </RoundedBox>
            </group>
          </group>
          <group ref={rightLegRef} position={[0.12, 0.0, 0]}>
            <RoundedBox castShadow args={[0.17, 0.26, 0.17]} radius={0.05} smoothness={3} position={[0, -0.15, 0]}>
              <meshStandardMaterial color={skinTone} roughness={0.62} />
            </RoundedBox>
            <group ref={rightShinRef} position={[0, -0.28, 0]}>
              <RoundedBox castShadow args={[0.16, 0.22, 0.17]} radius={0.045} smoothness={3} position={[0, -0.12, 0]}>
                <meshStandardMaterial color={sockColor} roughness={0.85} />
              </RoundedBox>
              <RoundedBox args={[0.165, 0.04, 0.175]} radius={0.02} smoothness={2} position={[0, -0.02, 0]}>
                <meshStandardMaterial color={accentColor} roughness={0.8} />
              </RoundedBox>
              <RoundedBox castShadow args={[0.17, 0.09, 0.25]} radius={0.035} smoothness={3} position={[0, -0.255, -0.04]}>
                <meshStandardMaterial color="#141414" roughness={0.35} metalness={0.15} />
              </RoundedBox>
            </group>
          </group>

          {/* Arms: shoulder → sleeve → ELBOW → forearm */}
          <group ref={leftArmRef} position={[-0.33, 0.66, 0]}>
            <RoundedBox castShadow args={[0.15, 0.22, 0.16]} radius={0.05} smoothness={3} position={[0, -0.11, 0]}>
              <meshStandardMaterial color={shirtColor} roughness={0.78} />
            </RoundedBox>
            <RoundedBox args={[0.155, 0.045, 0.165]} radius={0.02} smoothness={2} position={[0, -0.225, 0]}>
              <meshStandardMaterial color={accentColor} roughness={0.7} />
            </RoundedBox>
            <group ref={leftForeRef} position={[0, -0.25, 0]}>
              <RoundedBox castShadow args={[0.125, 0.22, 0.135]} radius={0.045} smoothness={3} position={[0, -0.11, 0]}>
                <meshStandardMaterial color={skinTone} roughness={0.62} />
              </RoundedBox>
            </group>
          </group>
          <group ref={rightArmRef} position={[0.33, 0.66, 0]}>
            <RoundedBox castShadow args={[0.15, 0.22, 0.16]} radius={0.05} smoothness={3} position={[0, -0.11, 0]}>
              <meshStandardMaterial color={shirtColor} roughness={0.78} />
            </RoundedBox>
            <RoundedBox args={[0.155, 0.045, 0.165]} radius={0.02} smoothness={2} position={[0, -0.225, 0]}>
              <meshStandardMaterial color={accentColor} roughness={0.7} />
            </RoundedBox>
            <group ref={rightForeRef} position={[0, -0.25, 0]}>
              <RoundedBox castShadow args={[0.125, 0.22, 0.135]} radius={0.045} smoothness={3} position={[0, -0.11, 0]}>
                <meshStandardMaterial color={skinTone} roughness={0.62} />
              </RoundedBox>
            </group>
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
