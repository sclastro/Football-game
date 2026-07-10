import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useGameStore, GOAL_FLASH_DURATION } from "@/game/state/gameStore";
import { playerRegistry, ballPosition } from "./worldRegistry";

// Broadcast side camera: sits high on one long touchline (+X) and looks ACROSS
// the pitch toward -X, so both goals and the far stand are in view. It pans
// gently along the pitch length (Z) with the controlled player but never
// rotates, so the whole match stays legible. On a goal it dollies in on the
// scorer for a celebration beat, then pulls back out when play resumes.
const SIDE_X = 34; // distance out along +X (near stand is removed, so view is clear)
const HEIGHT = 17;
const FOLLOW_Z = 0.5; // how much the camera tracks the player along the pitch
const LOOK_X = -3; // aim slightly past the centre toward the far side
const LOOK_HEIGHT = 1.5;
const POS_SMOOTH = 3.5;
const LOOK_SMOOTH = 5;

// Goal-celebration dolly: quickly push in low and close on the scorer.
const CELEB_SIDE_FROM = 24;
const CELEB_SIDE_TO = 14;
const CELEB_HEIGHT_FROM = 12;
const CELEB_HEIGHT_TO = 6.5;
const CELEB_SMOOTH = 6;

// Camera smoothing state is module-level: a single rig drives the one shared
// camera, so control hops between players never snap it.
let initialized = false;
const _target = new THREE.Vector3();
const _ball = new THREE.Vector3();
const _focus = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3();

/** World position to keep centred: the controlled player, else the ball. */
function focusPoint(out: THREE.Vector3): THREE.Vector3 {
  const st = useGameStore.getState();
  const rec = playerRegistry.get(st.controlledPlayerId);
  if (rec) return out.copy(rec.position);
  const b = ballPosition(out);
  return b ?? out.set(0, 0, 0);
}

/**
 * Single always-mounted camera rig. Positions the camera immediately on mount
 * (so the first painted frame is already the broadcast view, never the default
 * camera staring at the origin) and drives it every frame thereafter.
 */
export function CameraRig() {
  const { camera } = useThree();

  useLayoutEffect(() => {
    focusPoint(_target);
    const z = _target.z * FOLLOW_Z;
    camera.position.set(SIDE_X, HEIGHT, z);
    _currentLook.set(LOOK_X, LOOK_HEIGHT, z);
    camera.lookAt(_currentLook);
    initialized = true;
    return () => {
      initialized = false;
    };
  }, [camera]);

  useFrame((_, delta) => {
    const st = useGameStore.getState();

    // Celebration: frame the scorer (nearest scoring-team outfielder to the
    // ball) and dolly in over the stoppage.
    if (st.phase === "goalStoppage" && st.lastScorer) {
      const ball = ballPosition(_ball);
      let best = Infinity;
      _focus.copy(ball ?? _focus.set(0, 0, 0));
      for (const rec of playerRegistry.values()) {
        if (rec.team !== st.lastScorer || rec.isGoalkeeper) continue;
        const d = ball ? rec.position.distanceToSquared(ball) : 0;
        if (d < best) {
          best = d;
          _focus.copy(rec.position);
        }
      }
      const now = performance.now() / 1000;
      const remaining = THREE.MathUtils.clamp(
        (st.goalFlashUntil - now) / GOAL_FLASH_DURATION,
        0,
        1,
      );
      const push = 1 - remaining; // 0 -> 1 as the celebration plays out
      _desiredPos.set(
        THREE.MathUtils.lerp(CELEB_SIDE_FROM, CELEB_SIDE_TO, push),
        THREE.MathUtils.lerp(CELEB_HEIGHT_FROM, CELEB_HEIGHT_TO, push),
        _focus.z + 2,
      );
      _desiredLook.set(_focus.x, _focus.y + 1, _focus.z);
      const t = 1 - Math.exp(-CELEB_SMOOTH * delta);
      camera.position.lerp(_desiredPos, t);
      _currentLook.lerp(_desiredLook, t);
      camera.lookAt(_currentLook);
      return;
    }

    // Broadcast side view following the controlled player (or ball).
    focusPoint(_target);
    const z = _target.z * FOLLOW_Z;
    _desiredPos.set(SIDE_X, HEIGHT, z);
    _desiredLook.set(LOOK_X, LOOK_HEIGHT, z);
    if (!initialized) {
      camera.position.copy(_desiredPos);
      _currentLook.copy(_desiredLook);
      initialized = true;
    } else {
      const posT = 1 - Math.exp(-POS_SMOOTH * delta);
      const lookT = 1 - Math.exp(-LOOK_SMOOTH * delta);
      camera.position.lerp(_desiredPos, posT);
      _currentLook.lerp(_desiredLook, lookT);
    }
    camera.lookAt(_currentLook);
  });

  return null;
}
