export const PHYSICS_CONFIG = {
  gravity: [0, -20, 0] as [number, number, number],
  player: {
    walkSpeed: 3.7, // m/s — a controlled jog
    sprintSpeed: 6.4, // m/s
    acceleration: 26, // m/s^2 while input is held
    deceleration: 34, // m/s^2 while no input (higher = snappier stop)
    turnSpeed: 11, // rad/s-ish damping factor for facing yaw
    capsuleRadius: 0.35,
    capsuleHalfHeight: 0.5,
    /** Mass fed to the character controller for pushing the ball while dribbling. */
    mass: 80,
    /** AI outfielders move at this fraction of the human's top speed. */
    aiSpeedFactor: 0.86,
  },
  ball: {
    radius: 0.32, // larger so it reads clearly from the high camera
    mass: 0.45, // kg-ish; light enough to move, heavy enough not to fly off
    restitution: 0.32, // low bounce so ground balls stay down
    friction: 0.8,
    linearDamping: 0.55, // air + rolling resistance so it slows to a stop
    angularDamping: 0.8,
    /** Distance from player centre within which a shot/kick connects. */
    kickRange: 1.3,
    /** Base impulse for a tapped shot; scales up to maxShotImpulse when charged. */
    minShotImpulse: 5,
    maxShotImpulse: 16,
    /** Seconds of holding the shoot key to reach full power. */
    maxChargeTime: 0.8,
    /** Seconds you must wait between kicks (per player). */
    passCooldown: 0.6,
    /**
     * Shots below this 0..1 power stay flat on the deck — short strikes remain
     * easy to control. Past it the arc ramps in quadratically up to maxLift.
     */
    loftThreshold: 0.45,
    maxLiftImpulse: 4.5,
  },
};
