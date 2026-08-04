import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  aimState,
  landingPoint,
  predictPath,
  PREVIEW_SAMPLES,
} from "@/game/systems/aimPreview";
import { liftForPower } from "@/game/systems/ballPossessionSystem";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { useGameStore } from "@/game/state/gameStore";
import { isPlayingPhase } from "@/game/state/types";

const { minShotImpulse, maxShotImpulse } = PHYSICS_CONFIG.ball;

/** How many trail dots trace the predicted flight. */
const DOTS = 16;
/** Longest the ground aim bar gets, in metres, at full power. */
const MAX_BAR = 14;

const COLD = new THREE.Color("#ffffff");
const WARM = new THREE.Color("#fde047");
const HOT = new THREE.Color("#ef4444");

/**
 * The shooting HUD, drawn on the pitch itself:
 *  - a tapered bar from the ball showing aim direction and power;
 *  - a dotted trail tracing where the ball will actually fly (integrated with
 *    the same constants the physics engine uses, so it does not lie);
 *  - a ring marking the predicted landing spot.
 *
 * Everything is driven from `aimState` inside the frame loop, so aiming never
 * re-renders the scene.
 */
export function AimIndicator() {
  const groupRef = useRef<THREE.Group>(null);
  const barGroupRef = useRef<THREE.Group>(null);
  const barRef = useRef<THREE.Mesh>(null);
  const dotsRef = useRef<THREE.InstancedMesh>(null);
  const landingRef = useRef<THREE.Mesh>(null);

  const path = useMemo(
    () => Array.from({ length: PREVIEW_SAMPLES }, () => new THREE.Vector3()),
    [],
  );
  const impulse = useMemo(() => new THREE.Vector3(), []);
  const landing = useMemo(() => new THREE.Vector3(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // aimState is only refreshed while the ball is in play, so a whistle during
    // a wind-up would otherwise leave the indicator frozen on the pitch.
    if (!isPlayingPhase(useGameStore.getState().phase)) {
      aimState.active = false;
    }

    if (!aimState.active || aimState.power <= 0.02) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const p = aimState.power;
    // White → yellow → red as the strike gets heavier.
    if (p < 0.5) tint.copy(COLD).lerp(WARM, p * 2);
    else tint.copy(WARM).lerp(HOT, (p - 0.5) * 2);

    // --- Ground aim bar -----------------------------------------------------
    const barGroup = barGroupRef.current;
    const bar = barRef.current;
    if (barGroup && bar) {
      barGroup.position.set(aimState.originX, 0, aimState.originZ);
      // A plane laid flat has its length along local -Z after the X rotation,
      // so yaw the parent to point that axis down the aim direction.
      barGroup.rotation.y = Math.atan2(-aimState.dirX, -aimState.dirZ);
      const len = 2 + p * MAX_BAR;
      bar.scale.y = len;
      bar.position.z = -len / 2;
      (bar.material as THREE.MeshBasicMaterial).color.copy(tint);
      (bar.material as THREE.MeshBasicMaterial).opacity = 0.35 + p * 0.4;
    }

    // --- Predicted flight ---------------------------------------------------
    const drive = THREE.MathUtils.lerp(minShotImpulse, maxShotImpulse, p);
    impulse.set(aimState.dirX * drive, liftForPower(p), aimState.dirZ * drive);
    const count = predictPath(
      aimState.originX,
      aimState.originY,
      aimState.originZ,
      impulse,
      path,
    );

    const dots = dotsRef.current;
    if (dots) {
      for (let i = 0; i < DOTS; i++) {
        // Spread the dots evenly across however much path we computed.
        const idx = Math.min(count - 1, Math.round((i / (DOTS - 1)) * (count - 1)));
        const point = path[Math.max(0, idx)];
        const fade = 1 - i / DOTS;
        dummy.position.copy(point);
        dummy.scale.setScalar(count > 0 ? 0.35 + fade * 0.5 : 0);
        dummy.updateMatrix();
        dots.setMatrixAt(i, dummy.matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
      (dots.material as THREE.MeshBasicMaterial).color.copy(tint);
    }

    // --- Landing marker -----------------------------------------------------
    const mark = landingRef.current;
    if (mark && count > 0) {
      landingPoint(path, count, landing);
      mark.position.set(landing.x, 0.05, landing.z);
      (mark.material as THREE.MeshBasicMaterial).color.copy(tint);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={barGroupRef}>
        <mesh ref={barRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 1]} />
          <meshBasicMaterial transparent opacity={0.5} depthWrite={false} />
        </mesh>
      </group>

      <instancedMesh ref={dotsRef} args={[undefined, undefined, DOTS]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>

      <mesh ref={landingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.78, 24]} />
        <meshBasicMaterial transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}
