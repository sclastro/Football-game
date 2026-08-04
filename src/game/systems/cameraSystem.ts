import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  useGameStore,
  GOAL_FLASH_DURATION,
  ENTRANCE_DURATION,
} from "@/game/state/gameStore";
import { ENTRANCE_LINEUP_END } from "./entranceSystem";
import { playerRegistry, ballPosition } from "./worldRegistry";
import { registerPicker } from "./playerPicking";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";

const HALF_L = FIELD_DIMENSIONS.length / 2;
const PENALTY_SPOT = FIELD_DIMENSIONS.penaltySpot;

// Broadcast side camera: sits high on one long touchline (+X) and looks ACROSS
// the pitch toward -X, so both goals and the far stand are in view. It pans
// gently along the pitch length (Z) with the controlled player but never
// rotates, so the whole match stays legible. On a goal it dollies in on the
// scorer for a celebration beat, then pulls back out when play resumes.
const SIDE_X = 42; // distance out along +X (near stand is removed, so view is clear)
const HEIGHT = 21;
const FOLLOW_Z = 0.5; // how much the camera tracks the player along the pitch
const LOOK_X = -4; // aim slightly past the centre toward the far side
const LOOK_HEIGHT = 1.5;
const POS_SMOOTH = 3.5;
const LOOK_SMOOTH = 5;

// Goal-celebration dolly: quickly push in low and close on the scorer.
const CELEB_SIDE_FROM = 30;
const CELEB_SIDE_TO = 16;
const CELEB_HEIGHT_FROM = 14;
const CELEB_HEIGHT_TO = 7;
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
  const { camera, gl } = useThree();

  // The HTML control overlay sits above the canvas and swallows pointer events,
  // so player tapping is done by projecting players to screen space instead of
  // raycasting. That needs the live camera and canvas.
  useLayoutEffect(() => {
    registerPicker(camera, gl.domElement);
  }, [camera, gl]);

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

    // Entrance: a low lateral sweep across the two lines, then pull back out to
    // the broadcast position as the players break for kickoff.
    if (st.phase === "entrance") {
      const elapsed = ENTRANCE_DURATION - (st.entranceUntil - performance.now() / 1000);
      if (elapsed < ENTRANCE_LINEUP_END) {
        const sweep = THREE.MathUtils.clamp(elapsed / ENTRANCE_LINEUP_END, 0, 1);
        // Track from one end of the line to the other, close and low.
        _desiredPos.set(
          THREE.MathUtils.lerp(-14, 14, sweep),
          2.6,
          14,
        );
        _desiredLook.set(THREE.MathUtils.lerp(-10, 10, sweep), 1.5, 0);
      } else {
        _desiredPos.set(SIDE_X, HEIGHT, 0);
        _desiredLook.set(LOOK_X, LOOK_HEIGHT, 0);
      }
      const t = 1 - Math.exp(-2.6 * delta);
      camera.position.lerp(_desiredPos, t);
      _currentLook.lerp(_desiredLook, t);
      camera.lookAt(_currentLook);
      return;
    }

    // Shootout: sit behind the taker, looking down the pitch at the goal.
    if (st.phase === "shootout" || st.phase === "shootoutIntro") {
      const taker = st.shootout?.turn ?? "home";
      const attackSign = taker === "home" ? -1 : 1;
      const goalZ = attackSign * HALF_L;
      const spotZ = goalZ - attackSign * PENALTY_SPOT;
      _desiredPos.set(0, 4.2, spotZ - attackSign * -9);
      _desiredLook.set(0, 1.4, goalZ);
      const t = 1 - Math.exp(-CELEB_SMOOTH * delta);
      camera.position.lerp(_desiredPos, t);
      _currentLook.lerp(_desiredLook, t);
      camera.lookAt(_currentLook);
      return;
    }

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
