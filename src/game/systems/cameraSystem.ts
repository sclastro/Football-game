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
const SIDE_X = 22; // distance out along +X (near stand is removed, so view is clear)
const HEIGHT = 13;
/**
 * How much the camera tracks the player along the pitch. It used to be half,
 * which at this distance would leave you running off the edge of your own shot;
 * now it follows almost exactly, and the minimap covers the rest of the pitch.
 */
const FOLLOW_Z = 0.95;
/** How much the aim point drifts across the pitch with the player. */
const FOLLOW_X = 0.35;
const LOOK_HEIGHT = 1.4;
const POS_SMOOTH = 4.5;
const LOOK_SMOOTH = 6;

// Goal-celebration dolly: quickly push in low and close on the scorer.
const CELEB_SIDE_FROM = 30;
const CELEB_SIDE_TO = 16;
const CELEB_HEIGHT_FROM = 14;
const CELEB_HEIGHT_TO = 7;
const CELEB_SMOOTH = 6;

/**
 * Shootout camera: the broadcast position behind the goal being shot at.
 *
 * It has to clear the end stand, whose seating deck tops out around y = 8.1 and
 * whose roof hangs at about y = 9.85 — sitting at ground level behind the goal
 * would put the camera inside a block of seats. So it looks down over the back
 * of the stand instead, on a long lens, which is exactly where the real camera
 * for this shot lives.
 */
export const SHOOTOUT_CAM_HEIGHT = 8.8;
export const SHOOTOUT_CAM_BACK = 8.5;
/** Tight lens for the shootout; the match uses the wide one. */
const SHOOTOUT_FOV = 30;
const MATCH_FOV = 50;

/** Ease the lens between the two framings without a visible cut. */
function setFov(camera: THREE.Camera, target: number, delta: number): void {
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return;
  const next = THREE.MathUtils.lerp(cam.fov, target, 1 - Math.exp(-6 * delta));
  if (Math.abs(next - cam.fov) < 0.01) return;
  cam.fov = next;
  cam.updateProjectionMatrix();
}

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
    _currentLook.set(_target.x * FOLLOW_X, LOOK_HEIGHT, z);
    camera.lookAt(_currentLook);
    initialized = true;
    return () => {
      initialized = false;
    };
  }, [camera]);

  useFrame((_, delta) => {
    const st = useGameStore.getState();
    // Every path except the shootout uses the wide match lens; the shootout
    // branch overrides this before it returns.
    if (st.phase !== "shootout" && st.phase !== "shootoutIntro") {
      setFov(camera, MATCH_FOV, delta);
    }

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
        _desiredLook.set(0, LOOK_HEIGHT, 0);
      }
      const t = 1 - Math.exp(-2.6 * delta);
      camera.position.lerp(_desiredPos, t);
      _currentLook.lerp(_desiredLook, t);
      camera.lookAt(_currentLook);
      return;
    }

    // Shootout: directly behind the keeper, looking back out through the goal
    // at the taker. Dead centre and identical for every kick, so the camera can
    // never hint at which way the ball or the dive is going — and so the goal
    // mouth sits square on screen, which is what the aiming circles are drawn
    // over.
    if (st.phase === "shootout" || st.phase === "shootoutIntro") {
      const taker = st.shootout?.turn ?? "home";
      const attackSign = taker === "home" ? -1 : 1;
      const goalZ = attackSign * HALF_L;
      const spotZ = goalZ - attackSign * PENALTY_SPOT;
      _desiredPos.set(0, SHOOTOUT_CAM_HEIGHT, goalZ + attackSign * SHOOTOUT_CAM_BACK);
      _desiredLook.set(0, 1.0, THREE.MathUtils.lerp(goalZ, spotZ, 0.45));
      setFov(camera, SHOOTOUT_FOV, delta);
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
    _desiredLook.set(_target.x * FOLLOW_X, LOOK_HEIGHT, z);
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
