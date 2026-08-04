import { RigidBody } from "@react-three/rapier";

// Pitch size. EVERY marking below is derived from these two numbers, so the
// pitch can be resized without anything drifting out of proportion.
const FIELD_LENGTH = 72; // along Z (goal lines at +/- 36)
const FIELD_WIDTH = 46; // along X (touchlines at +/- 23)
const HALF_W = FIELD_WIDTH / 2;
const HALF_L = FIELD_LENGTH / 2;

// Marking proportions, taken from real pitch ratios.
const CENTRE_R = FIELD_WIDTH * 0.142; // centre circle radius
const PENALTY_W = FIELD_WIDTH * 0.52;
const PENALTY_D = FIELD_LENGTH * 0.125;
const GOAL_AREA_W = FIELD_WIDTH * 0.26;
const GOAL_AREA_D = FIELD_LENGTH * 0.05;
const PENALTY_SPOT = FIELD_LENGTH * 0.097; // distance in from the goal line
const CORNER_R = 1;

// Safety geometry.
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 2;
const END_WALL_GAP = 4; // walls sit this far behind the goal lines
const SIDE_WALL_GAP = 3; // and this far outside the touchlines
const GROUND_SIZE = Math.max(FIELD_LENGTH, FIELD_WIDTH) * 2.4;

const LINE = "#f4f7f4";
const LINE_Y = 0.02;
const LINE_W = 0.18;

/** A flat white line segment lying on the pitch. */
function Line({
  x = 0,
  z = 0,
  sx,
  sz,
}: {
  x?: number;
  z?: number;
  sx: number;
  sz: number;
}) {
  return (
    <mesh position={[x, LINE_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[sx, sz]} />
      <meshBasicMaterial color={LINE} />
    </mesh>
  );
}

/**
 * A flat arc lying on the pitch. Angles are in the ring's local 2D frame, which
 * the -90° X rotation maps as: local +X → world +X, local +Y → world -Z.
 */
function Arc({
  x = 0,
  z = 0,
  radius,
  thetaStart,
  thetaLength,
}: {
  x?: number;
  z?: number;
  radius: number;
  thetaStart: number;
  thetaLength: number;
}) {
  return (
    <mesh position={[x, LINE_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry
        args={[radius - LINE_W, radius, 48, 1, thetaStart, thetaLength]}
      />
      <meshBasicMaterial color={LINE} />
    </mesh>
  );
}

/** A flat filled dot (centre spot / penalty spots). */
function Spot({ z, radius }: { z: number; radius: number }) {
  return (
    <mesh position={[0, LINE_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 16]} />
      <meshBasicMaterial color={LINE} />
    </mesh>
  );
}

/** A rectangle outline open at the goal line — penalty and goal areas. */
function Box({
  z,
  width,
  depth,
  end,
}: {
  z: number;
  width: number;
  depth: number;
  end: 1 | -1;
}) {
  const inner = z - end * depth;
  return (
    <>
      <Line x={-width / 2} z={z - (end * depth) / 2} sx={LINE_W} sz={depth} />
      <Line x={width / 2} z={z - (end * depth) / 2} sx={LINE_W} sz={depth} />
      <Line z={inner} sx={width} sz={LINE_W} />
    </>
  );
}

function Markings() {
  // The penalty arc ("D") is the part of a CENTRE_R circle around the penalty
  // spot that pokes outside the penalty box.
  const arcHalf = Math.acos(
    Math.min(1, (PENALTY_D - PENALTY_SPOT) / CENTRE_R),
  );

  return (
    <group>
      {/* Touchlines + goal lines */}
      <Line z={-HALF_L} sx={FIELD_WIDTH} sz={LINE_W} />
      <Line z={HALF_L} sx={FIELD_WIDTH} sz={LINE_W} />
      <Line x={-HALF_W} sx={LINE_W} sz={FIELD_LENGTH} />
      <Line x={HALF_W} sx={LINE_W} sz={FIELD_LENGTH} />

      {/* Halfway line + centre circle + spot */}
      <Line sx={FIELD_WIDTH} sz={LINE_W} />
      <Arc radius={CENTRE_R} thetaStart={0} thetaLength={Math.PI * 2} />
      <Spot z={0} radius={0.25} />

      {/* Penalty + goal areas, penalty spots and arcs, both ends */}
      <Box z={-HALF_L} end={-1} width={PENALTY_W} depth={PENALTY_D} />
      <Box z={-HALF_L} end={-1} width={GOAL_AREA_W} depth={GOAL_AREA_D} />
      <Spot z={-HALF_L + PENALTY_SPOT} radius={0.22} />
      <Arc
        z={-HALF_L + PENALTY_SPOT}
        radius={CENTRE_R}
        thetaStart={-Math.PI / 2 - arcHalf}
        thetaLength={arcHalf * 2}
      />

      <Box z={HALF_L} end={1} width={PENALTY_W} depth={PENALTY_D} />
      <Box z={HALF_L} end={1} width={GOAL_AREA_W} depth={GOAL_AREA_D} />
      <Spot z={HALF_L - PENALTY_SPOT} radius={0.22} />
      <Arc
        z={HALF_L - PENALTY_SPOT}
        radius={CENTRE_R}
        thetaStart={Math.PI / 2 - arcHalf}
        thetaLength={arcHalf * 2}
      />

      {/* Corner arcs, each bulging back into the field of play */}
      <Arc x={-HALF_W} z={-HALF_L} radius={CORNER_R} thetaStart={-Math.PI / 2} thetaLength={Math.PI / 2} />
      <Arc x={HALF_W} z={-HALF_L} radius={CORNER_R} thetaStart={Math.PI} thetaLength={Math.PI / 2} />
      <Arc x={-HALF_W} z={HALF_L} radius={CORNER_R} thetaStart={0} thetaLength={Math.PI / 2} />
      <Arc x={HALF_W} z={HALF_L} radius={CORNER_R} thetaStart={Math.PI / 2} thetaLength={Math.PI / 2} />
    </group>
  );
}

/** Mown stripes across the pitch for a broadcast look. */
function Stripes() {
  const count = 11;
  const stripeLen = FIELD_LENGTH / count;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.008, -HALF_L + stripeLen * (i + 0.5)]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[FIELD_WIDTH, stripeLen]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#2f8f3a" : "#2a7d33"} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Static pitch. A large solid ground plane underlies everything (so nothing can
 * ever fall through the seam between the pitch and the stands), the mown pitch
 * surface + markings sit on top, and thick tall walls keep players and ball in
 * play.
 */
export function Field() {
  return (
    <>
      {/* Safety ground: covers well beyond the pitch and under the stands. */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.9}>
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[GROUND_SIZE, 1, GROUND_SIZE]} />
          <meshStandardMaterial color="#1f5f28" />
        </mesh>
      </RigidBody>

      <Stripes />
      <Markings />

      {/* End walls sit BEHIND the goals so they never block the goal mouth. */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, -HALF_L - END_WALL_GAP]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, HALF_L + END_WALL_GAP]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        </mesh>
      </RigidBody>
      {/* Side walls sit outside the touchlines: pure safety nets. The ball
          fully crosses the line first, so out-of-play detection can fire. */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-HALF_W - SIDE_WALL_GAP, WALL_HEIGHT / 2, 0]} visible={false}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, FIELD_LENGTH + 10]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[HALF_W + SIDE_WALL_GAP, WALL_HEIGHT / 2, 0]} visible={false}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, FIELD_LENGTH + 10]} />
        </mesh>
      </RigidBody>
    </>
  );
}

export const FIELD_DIMENSIONS = {
  length: FIELD_LENGTH,
  width: FIELD_WIDTH,
  /** Distance in from a goal line to the penalty spot (used by the shootout). */
  penaltySpot: PENALTY_SPOT,
  /** Penalty area depth, used by AI to know when it's in the box. */
  penaltyDepth: PENALTY_D,
  penaltyWidth: PENALTY_W,
};
