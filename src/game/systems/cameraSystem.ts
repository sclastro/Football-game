import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

const FOLLOW_DISTANCE = 6;
const FOLLOW_HEIGHT = 3.2;
const LOOK_AHEAD_HEIGHT = 0.8;
const POSITION_SMOOTH = 4; // higher = snappier follow
const LOOKAT_SMOOTH = 6;

/**
 * Third-person chase camera: follows behind the target's facing direction (yaw),
 * smoothed so cuts on control-switch still feel continuous rather than instant-snap.
 */
export function useCameraSystem() {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredLookAt = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  const update = (delta: number, targetPosition: THREE.Vector3, targetYaw: number) => {
    const behind = new THREE.Vector3(
      Math.sin(targetYaw) * FOLLOW_DISTANCE,
      0,
      Math.cos(targetYaw) * FOLLOW_DISTANCE,
    );
    desiredPosition.current
      .copy(targetPosition)
      .add(behind)
      .setY(targetPosition.y + FOLLOW_HEIGHT);
    desiredLookAt.current.copy(targetPosition).setY(targetPosition.y + LOOK_AHEAD_HEIGHT);

    if (!initialized.current) {
      camera.position.copy(desiredPosition.current);
      currentLookAt.current.copy(desiredLookAt.current);
      initialized.current = true;
    } else {
      const posT = 1 - Math.exp(-POSITION_SMOOTH * delta);
      const lookT = 1 - Math.exp(-LOOKAT_SMOOTH * delta);
      camera.position.lerp(desiredPosition.current, posT);
      currentLookAt.current.lerp(desiredLookAt.current, lookT);
    }

    camera.lookAt(currentLookAt.current);
  };

  return update;
}
