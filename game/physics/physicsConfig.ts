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
    /** Mass fed to the character controller for pushing the ball while dribbling. */
    mass: 80,
  },
  ball: {
    radius: 0.22, // ~ real football scaled to our blocky players
    mass: 0.45, // kg-ish; light enough to move, heavy enough not to fly off
    restitution: 0.55, // bounciness
    friction: 0.7,
    linearDamping: 0.6, // air + rolling resistance so it slows to a stop
    angularDamping: 0.8,
    /** Distance from player centre within which a shot/kick connects. */
    kickRange: 1.1,
    /** Base impulse for a tapped shot; scales up to maxShotImpulse when charged. */
    minShotImpulse: 4,
    maxShotImpulse: 11,
    /** Seconds of holding the shoot key to reach full power. */
    maxChargeTime: 0.8,
    /** Upward component added to a shot so it lifts off the ground a little. */
    shotLift: 0.28,
  },
};
