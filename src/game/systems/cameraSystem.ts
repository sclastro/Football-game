import * as THREE from "three";
import { useThree } from "@react-three/fiber";

// Broadcast side camera: sits high on one long touchline (+X) and looks ACROSS
// the pitch toward -X, so both goals and the far stand are in view. It pans
// gently along the pitch length (Z) with the player but never rotates, so the
// whole match stays legible.
const SIDE_X = 34; // distance out along +X (near stand is removed, so view is clear)
const HEIGHT = 17;
const FOLLOW_Z = 0.5; // how much the camera tracks the player along the pitch
const LOOK_X = -3; // aim slightly past the centre toward the far side
const LOOK_HEIGHT = 1.5;
const POS_SMOOTH = 3.5;
const LOOK_SMOOTH = 5;

// Camera smoothing state is MODULE-level and shared by every player entity:
// control hops between players constantly (control follows the ball), and
// per-entity state made the camera snap on every switch. Shared state keeps
// one continuous, smooth pan no matter who is controlled.
const shared = {
  initialized: false,
  currentLook: new THREE.Vector3(),
};
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();

/**
 * Fixed-orientation side camera. `targetPosition` is the controlled player.
 */
export function useCameraSystem() {
  const { camera } = useThree();

  const update = (delta: number, targetPosition: THREE.Vector3) => {
    const z = targetPosition.z * FOLLOW_Z;
    _desiredPos.set(SIDE_X, HEIGHT, z);
    _desiredLook.set(LOOK_X, LOOK_HEIGHT, z);

    if (!shared.initialized) {
      camera.position.copy(_desiredPos);
      shared.currentLook.copy(_desiredLook);
      shared.initialized = true;
    } else {
      const posT = 1 - Math.exp(-POS_SMOOTH * delta);
      const lookT = 1 - Math.exp(-LOOK_SMOOTH * delta);
      camera.position.lerp(_desiredPos, posT);
      shared.currentLook.lerp(_desiredLook, lookT);
    }
    camera.lookAt(shared.currentLook);
  };

  return update;
}
