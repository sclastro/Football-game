import { useEffect, useRef } from "react";
import * as THREE from "three";

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const SPRINT_KEYS = ["ShiftLeft", "ShiftRight"];
const SHOOT_KEYS = ["Space"];

export interface InputState {
  /** Normalized movement direction on the XZ plane (camera-relative forward = -Z). */
  moveDirection: THREE.Vector2;
  sprinting: boolean;
  /** True while the shoot key is held down. */
  shootHeld: boolean;
  /** Seconds the shoot key has been held so far (0 when not held). */
  shootCharge: number;
  /** True only on the single frame the shoot key is released (edge trigger). */
  shootReleased: boolean;
}

/**
 * Tracks raw keyboard state. Call `readInput` from inside a useFrame callback
 * to get the current movement vector without triggering React re-renders.
 * Shoot is charge-based: hold to build power, release to fire.
 */
export function useInputSystem() {
  const pressedKeys = useRef(new Set<string>());
  const prevShootHeld = useRef(false);
  const shootPressedAt = useRef<number | null>(null);
  const stateRef = useRef<InputState>({
    moveDirection: new THREE.Vector2(0, 0),
    sprinting: false,
    shootHeld: false,
    shootCharge: 0,
    shootReleased: false,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Stop Space from scrolling the page while charging a shot.
      if (SHOOT_KEYS.includes(e.code)) e.preventDefault();
      pressedKeys.current.add(e.code);
    };
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
    const state = stateRef.current;

    const forward = MOVE_KEYS.forward.some((k) => keys.has(k));
    const backward = MOVE_KEYS.backward.some((k) => keys.has(k));
    const left = MOVE_KEYS.left.some((k) => keys.has(k));
    const right = MOVE_KEYS.right.some((k) => keys.has(k));

    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const z = (backward ? 1 : 0) - (forward ? 1 : 0);
    state.moveDirection.set(x, z);
    if (state.moveDirection.lengthSq() > 1) state.moveDirection.normalize();

    state.sprinting = SPRINT_KEYS.some((k) => keys.has(k));

    const shootHeld = SHOOT_KEYS.some((k) => keys.has(k));
    const now = performance.now();
    state.shootReleased = false;

    if (shootHeld && !prevShootHeld.current) {
      shootPressedAt.current = now;
    } else if (!shootHeld && prevShootHeld.current) {
      state.shootReleased = true;
      state.shootCharge = shootPressedAt.current
        ? (now - shootPressedAt.current) / 1000
        : 0;
      shootPressedAt.current = null;
    }

    state.shootHeld = shootHeld;
    if (shootHeld && shootPressedAt.current) {
      state.shootCharge = (now - shootPressedAt.current) / 1000;
    } else if (!shootHeld && !state.shootReleased) {
      state.shootCharge = 0;
    }

    prevShootHeld.current = shootHeld;
    return state;
  };

  return readInput;
}
