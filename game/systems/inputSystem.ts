import { useEffect, useRef } from "react";
import * as THREE from "three";

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const SPRINT_KEYS = ["ShiftLeft", "ShiftRight"];

export interface InputState {
  /** Normalized movement direction on the XZ plane (camera-relative forward = -Z). */
  moveDirection: THREE.Vector2;
  sprinting: boolean;
}

/**
 * Tracks raw keyboard state. Call `readInput` from inside a useFrame callback
 * to get the current movement vector without triggering React re-renders.
 */
export function useInputSystem() {
  const pressedKeys = useRef(new Set<string>());
  const stateRef = useRef<InputState>({
    moveDirection: new THREE.Vector2(0, 0),
    sprinting: false,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => pressedKeys.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const readInput = (): InputState => {
    const keys = pressedKeys.current;
    const forward = MOVE_KEYS.forward.some((k) => keys.has(k));
    const backward = MOVE_KEYS.backward.some((k) => keys.has(k));
    const left = MOVE_KEYS.left.some((k) => keys.has(k));
    const right = MOVE_KEYS.right.some((k) => keys.has(k));

    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const z = (backward ? 1 : 0) - (forward ? 1 : 0);
    const dir = stateRef.current.moveDirection;
    dir.set(x, z);
    if (dir.lengthSq() > 1) dir.normalize();

    stateRef.current.sprinting = SPRINT_KEYS.some((k) => keys.has(k));
    return stateRef.current;
  };

  return readInput;
}
