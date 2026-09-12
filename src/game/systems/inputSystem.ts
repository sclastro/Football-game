import { useEffect, useRef } from "react";
import * as THREE from "three";
import { virtualInput } from "./virtualInput";
import { tutorialState } from "./tutorialSystem";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";

const MAX_CHARGE_TIME = PHYSICS_CONFIG.ball.maxChargeTime;

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;

const SPRINT_KEYS = ["ShiftLeft", "ShiftRight"];
// J is a second shoot key so the tutorial can own Space for "next lesson"
// without leaving keyboard players unable to shoot while they are in it.
const SHOOT_KEYS = ["Space", "KeyJ"];
const PASS_KEYS = ["KeyE"];
const FLICK_KEYS = ["KeyQ"];
const SLIDE_KEYS = ["KeyF", "ControlLeft", "ControlRight"];

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
  /** True only on the single frame the rainbow-flick key is pressed. */
  flickPressed: boolean;
  /** True only on the single frame the slide key is pressed. */
  slidePressed: boolean;
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
  const prevFlickHeld = useRef(false);
  const prevSlideHeld = useRef(false);
  const shootPressedAt = useRef<number | null>(null);
  const stateRef = useRef<InputState>({
    moveDirection: new THREE.Vector2(0, 0),
    sprinting: false,
    shootHeld: false,
    shootCharge: 0,
    shootReleased: false,
    passPressed: false,
    flickPressed: false,
    slidePressed: false,
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
    // The tutorial owns Space for "next lesson", so while it is running only J
    // shoots — otherwise every step you advanced would also blast the ball.
    const shootKeys = tutorialState.active
      ? SHOOT_KEYS.filter((k) => k !== "Space")
      : SHOOT_KEYS;
    const shootHeld = shootKeys.some((k) => keys.has(k));
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

    // Touch SHOOT circle: released this frame → fire with the drag's power. The
    // drag length is the ONLY thing it contributes; direction comes from the
    // player's facing, in both control schemes.
    if (virtualInput.shootFired) {
      state.shootReleased = true;
      state.shootCharge = virtualInput.firePower * MAX_CHARGE_TIME;
      virtualInput.shootFired = false;
    }
    // Hold state has to include the touch circle too, or the on-pitch power
    // arrow never appears for touch players.
    state.shootHeld = state.shootHeld || virtualInput.shootHeld;
    if (virtualInput.shootHeld) {
      state.shootCharge = virtualInput.shootPower * MAX_CHARGE_TIME;
    }

    const passHeld = PASS_KEYS.some((k) => keys.has(k)) || virtualInput.passRequested;
    state.passPressed = passHeld && !prevPassHeld.current;
    prevPassHeld.current = passHeld;
    virtualInput.passRequested = false; // consume the tap

    const flickHeld = FLICK_KEYS.some((k) => keys.has(k)) || virtualInput.flickRequested;
    state.flickPressed = flickHeld && !prevFlickHeld.current;
    prevFlickHeld.current = flickHeld;
    virtualInput.flickRequested = false;

    const slideHeld = SLIDE_KEYS.some((k) => keys.has(k)) || virtualInput.slideRequested;
    state.slidePressed = slideHeld && !prevSlideHeld.current;
    prevSlideHeld.current = slideHeld;
    virtualInput.slideRequested = false;

    return state;
  };

  return readInput;
}
