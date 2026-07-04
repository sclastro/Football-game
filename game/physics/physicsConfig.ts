export const PHYSICS_CONFIG = {
  gravity: [0, -20, 0] as [number, number, number],
  player: {
    walkSpeed: 4.2, // m/s
    sprintSpeed: 7.5, // m/s
    acceleration: 22, // m/s^2 while input is held
    deceleration: 30, // m/s^2 while no input (higher = snappier stop)
    turnSpeed: 12, // rad/s-ish damping factor for facing yaw
    capsuleRadius: 0.35,
    capsuleHalfHeight: 0.5,
  },
};
