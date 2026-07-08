import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

// High, fixed-angle camera that sits behind the home attacking direction (+Z)
// and looks down the pitch toward -Z. It never rotates with the player — it
// only translates to follow, so "up the pitch" is always up the screen.
const HEIGHT = 15; // metres above the pitch
const BACK = 13; // metres behind the player (+Z)
const LOOK_AHEAD = 6; // look this far ahead of the player (toward -Z)
const LOOK_HEIGHT = 1.5;
// Follow gains: the camera tracks lateral (X) and along-pitch (Z) motion, but
// gently, so it drifts rather than sticking rigidly to the player.
const FOLLOW_X = 0.8;
const POS_SMOOTH = 3.5;
const LOOK_SMOOTH = 5;

/**
 * Fixed-angle follow camera. `targetPosition` is the controlled player; yaw is
 * ignored (the camera orientation is constant) so pressing forward never spins
 * the view.
 */
export function useCameraSystem() {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  const update = (delta: number, targetPosition: THREE.Vector3) => {
    // Camera position: behind (+Z) and above, panning with the player. Lateral
    // follow is damped so the player can drift across frame a little.
    desiredPos.current.set(
      targetPosition.x * FOLLOW_X,
      HEIGHT,
      targetPosition.z + BACK,
    );
    desiredLook.current.set(
      targetPosition.x * FOLLOW_X,
      LOOK_HEIGHT,
      targetPosition.z - LOOK_AHEAD,
    );

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
