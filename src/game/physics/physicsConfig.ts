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
    /**
     * Rolling + air resistance. A ground ball travels `impulse / mass / damping`
     * before coming to rest, so this number sets the whole game's shooting range.
     * At the old 0.55 a full-power shot carried ~65 m on a 72 m pitch — you could
     * score from against your own end wall, which made defending pointless.
     */
    linearDamping: 0.95,
    angularDamping: 0.8,
    /** Distance from player centre within which a shot/kick connects. */
    kickRange: 1.3,
    /**
     * Impulse range for a shot. With the damping above these give roughly a 9 m
     * tap and a 30 m full strike: enough to beat a keeper from the edge of the
     * box, nowhere near enough to reach the far goal from your own half.
     */
    minShotImpulse: 4,
    maxShotImpulse: 13,
    /** Seconds of holding the shoot key to reach full power. */
    maxChargeTime: 0.8,
    /** Seconds you must wait between kicks (per player). */
    passCooldown: 0.6,
    /** Shots taken from beyond this lose power and accuracy with distance. */
    accurateRange: 16,
    /** Fraction of power left at the very longest range. */
    longRangePowerFloor: 0.62,
    /** Extra aim scatter (radians, each way) at the very longest range. */
    longRangeScatter: 0.13,
  },
};
