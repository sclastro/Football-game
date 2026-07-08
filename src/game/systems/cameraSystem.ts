import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

// Broadcast side camera: sits high on one long touchline (+X) and looks ACROSS
// the pitch toward -X, so both goals and the far stand are in view. It pans
// gently along the pitch length (Z) with the player but never rotates, so the
// whole match stays legible.
const SIDE_X = 40; // distance out along +X
const HEIGHT = 20;
const FOLLOW_Z = 0.45; // how much the camera tracks the player along the pitch
const LOOK_X = -2; // aim slightly past the centre toward the far side
const LOOK_HEIGHT = 1.5;
const POS_SMOOTH = 3.5;
const LOOK_SMOOTH = 5;

/**
 * Fixed-orientation side camera. `targetPosition` is the controlled player.
 */
export function useCameraSystem() {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  const update = (delta: number, targetPosition: THREE.Vector3) => {
    const z = targetPosition.z * FOLLOW_Z;
    desiredPos.current.set(SIDE_X, HEIGHT, z);
    desiredLook.current.set(LOOK_X, LOOK_HEIGHT, z);

    if (!initialized.current) {
      camera.position.copy(desiredPos.current);
      currentLook.current.copy(desiredLook.current);
      initialized.current = true;
    } else {
      const posT = 1 - Math.exp(-POS_SMOOTH * delta);
      const lookT = 1 - Math.exp(-LOOK_SMOOTH * delta);
      camera.position.lerp(desiredPos.current, posT);
      currentLook.current.lerp(desiredLook.current, lookT);
    }
    camera.lookAt(currentLook.current);
  };

  return update;
}
