import { useEffect, useRef } from "react";
import * as THREE from "three";
import { virtualInput } from "./virtualInput";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";

const MAX_CHARGE_TIME = PHYSICS_CONFIG.ball.maxChargeTime;

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const SPRINT_KEYS = ["ShiftLeft", "ShiftRight"];
const SHOOT_KEYS = ["Space"];
const PASS_KEYS = ["KeyE"];

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
  /** True only on the single frame the pass key is pressed (edge trigger). */
  passPressed: boolean;
  /** When true, shoot toward (shootAimX, shootAimZ) instead of the facing dir. */
  hasShootAim: boolean;
  /** World-space aim direction for the shot (touch stick drag). */
  shootAimX: number;
  shootAimZ: number;
}

/**
 * Tracks raw keyboard state. Call `readInput` from inside a useFrame callback
 * to get the current movement vector without triggering React re-renders.
 * Shoot is charge-based: hold to build power, release to fire.
 */
export function useInputSystem() {
  const pressedKeys = useRef(new Set<string>());
  const prevShootHeld = useRef(false);
  const prevPassHeld = useRef(false);
  const shootPressedAt = useRef<number | null>(null);
  const stateRef = useRef<InputState>({
    moveDirection: new THREE.Vector2(0, 0),
    sprinting: false,
    shootHeld: false,
    shootCharge: 0,
    shootReleased: false,
    passPressed: false,
    hasShootAim: false,
    shootAimX: 0,
    shootAimZ: 0,
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

    // World-space vector for the side camera (looks across -X from the +X side):
    // W = into the pitch (-X), S = toward camera (+X), A/D = along the pitch (Z).
    // moveDirection.x maps to world X, .y maps to world Z.
    const worldX = (backward ? 1 : 0) - (forward ? 1 : 0) + virtualInput.moveY;
    const worldZ = (left ? 1 : 0) - (right ? 1 : 0) - virtualInput.moveX;
    state.moveDirection.set(worldX, worldZ);
    if (state.moveDirection.lengthSq() > 1) state.moveDirection.normalize();

    state.sprinting = SPRINT_KEYS.some((k) => keys.has(k)) || virtualInput.sprint;

    // Keyboard shoot: hold Space to charge, release to fire along facing.
    const shootHeld = SHOOT_KEYS.some((k) => keys.has(k));
    const now = performance.now();
    state.shootReleased = false;
    state.hasShootAim = false;
    state.shootAimX = 0;
    state.shootAimZ = 0;

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

    // Touch SHOOT stick: released this frame → fire with drag power + aim.
    // Screen (right=+x, down=+y) maps to world (x = down, z = -right), matching
    // the movement stick so a drag up shoots up the pitch, right shoots right.
    if (virtualInput.shootFired) {
      state.shootReleased = true;
      state.shootCharge = virtualInput.firePower * MAX_CHARGE_TIME;
      const ax = virtualInput.fireAimX;
      const ay = virtualInput.fireAimY;
      if (Math.hypot(ax, ay) > 0.05) {
        state.hasShootAim = true;
        state.shootAimX = ay;
        state.shootAimZ = -ax;
      }
      virtualInput.shootFired = false;
    }

    const passHeld = PASS_KEYS.some((k) => keys.has(k)) || virtualInput.passRequested;
    state.passPressed = passHeld && !prevPassHeld.current;
    prevPassHeld.current = passHeld;
    virtualInput.passRequested = false; // consume the tap

    return state;
  };

  return readInput;
}
