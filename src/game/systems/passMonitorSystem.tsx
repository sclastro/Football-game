import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/game/state/gameStore";
import { ballPosition, passState, playerRegistry } from "./worldRegistry";

/** Ball-to-receiver distance that counts as the pass connecting. */
const RECEIVE_RADIUS = 1.4;

const _ball = new THREE.Vector3();

/**
 * Watches an in-flight pass and switches control to the receiver the moment
 * the ball reaches them (the auto-switch at the heart of the game design).
 * The pass is dropped on expiry or when play stops.
 */
export function PassMonitor() {
  useFrame(() => {
    if (!passState.receiverId) return;

    const state = useGameStore.getState();
    if (state.phase !== "live") {
      passState.receiverId = null;
      return;
    }

    const now = performance.now() / 1000;
    if (now > passState.expiresAt) {
      passState.receiverId = null;
      return;
    }

    const receiver = playerRegistry.get(passState.receiverId);
    const ball = ballPosition(_ball);
    if (!receiver || !ball) {
      passState.receiverId = null;
      return;
    }

    if (receiver.position.distanceTo(ball) <= RECEIVE_RADIUS) {
      state.setControlledPlayer(receiver.id);
      passState.receiverId = null;
    }
  });

  return null;
}
