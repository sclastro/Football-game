import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import type { InputState } from "./inputSystem";

const {
  walkSpeed,
  sprintSpeed,
  acceleration,
  deceleration,
  turnSpeed,
} = PHYSICS_CONFIG.player;

const GRAVITY_ACCEL = 40;
const GROUNDED_STICK_SPEED = -1;

// Scratch objects shared by every controller — this runs 16 times a frame, so
// nothing here may allocate.
const _target = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _upAxis = new THREE.Vector3(0, 1, 0);

function moveTowards(current: number, target: number, maxDelta: number) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

/** Shortest-path lerp between two angles (radians). */
function lerpAngle(current: number, target: number, t: number) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * t;
}

export interface PlayerControllerHandle {
  /** Advances the character by one physics step using the given input. Returns current speed (m/s). */
  update: (delta: number, input: InputState, speedScale?: number) => number;
  yaw: RefObject<number>;
  /** Zero out velocity and face the given yaw (used on kickoff teleports). */
  reset: (yaw?: number) => void;
}

/**
 * Drives a kinematic RigidBody via a Rapier KinematicCharacterController, applying
 * accelerate/decelerate movement and smoothed turning so the character reads as
 * having "weight" rather than snapping to full speed instantly.
 */
export function usePlayerCharacterController(
  rigidBodyRef: RefObject<RapierRigidBody | null>,
): PlayerControllerHandle {
  const { world } = useRapier();
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(
    null,
  );
  const velocity = useRef(new THREE.Vector3());
  const verticalVelocity = useRef(0);
  const yaw = useRef(0);

  useEffect(() => {
    const controller = world.createCharacterController(0.02);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setMaxSlopeClimbAngle((60 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    controller.setSlideEnabled(true);
    controller.enableAutostep(0.3, 0.2, true);
    controller.enableSnapToGround(0.3);
    // Let the character shove dynamic bodies (the ball) aside while dribbling.
    controller.setApplyImpulsesToDynamicBodies(true);
    controller.setCharacterMass(PHYSICS_CONFIG.player.mass);
    controllerRef.current = controller;
    return () => {
      world.removeCharacterController(controller);
      controllerRef.current = null;
    };
  }, [world]);

  const update = (delta: number, input: InputState, speedScale = 1) => {
    const rigidBody = rigidBodyRef.current;
    const controller = controllerRef.current;
    if (!rigidBody || !controller) return 0;

    const collider = rigidBody.collider(0);
    if (!collider) return 0;

    const maxSpeed = (input.sprinting ? sprintSpeed : walkSpeed) * speedScale;
    const hasInput = input.moveDirection.lengthSq() > 0.0001;

    // Input magnitude is meaningful: the joystick's expo curve and the AI's
    // arrival ramp both express "move this way, but only this fast" by
    // shortening the vector. Clamp to 1 rather than normalising, or every input
    // collapses to full speed and the controls stop being analog.
    _target.set(input.moveDirection.x, 0, input.moveDirection.y);
    const inputLen = _target.length();
    if (inputLen > 1) _target.multiplyScalar(1 / inputLen);
    _target.multiplyScalar(maxSpeed);

    const rate = hasInput ? acceleration : deceleration;
    const maxDelta = rate * delta;
    velocity.current.x = moveTowards(velocity.current.x, _target.x, maxDelta);
    velocity.current.z = moveTowards(velocity.current.z, _target.z, maxDelta);

    if (hasInput) {
      const targetYaw = Math.atan2(-input.moveDirection.x, -input.moveDirection.y);
      yaw.current = lerpAngle(yaw.current, targetYaw, Math.min(1, turnSpeed * delta));
    }

    verticalVelocity.current -= GRAVITY_ACCEL * delta;

    const desiredMovement = {
      x: velocity.current.x * delta,
      y: verticalVelocity.current * delta,
      z: velocity.current.z * delta,
    };

    controller.computeColliderMovement(collider, desiredMovement);
    const corrected = controller.computedMovement();

    if (controller.computedGrounded()) {
      verticalVelocity.current = GROUNDED_STICK_SPEED;
    }

    const current = rigidBody.translation();
    rigidBody.setNextKinematicTranslation({
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    });

    _quat.setFromAxisAngle(_upAxis, yaw.current);
    rigidBody.setNextKinematicRotation(_quat);

    return Math.hypot(velocity.current.x, velocity.current.z);
  };

  const reset = (newYaw = 0) => {
    velocity.current.set(0, 0, 0);
    verticalVelocity.current = 0;
    yaw.current = newYaw;
  };

  return { update, yaw, reset };
}
