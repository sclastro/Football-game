import { RigidBody } from "@react-three/rapier";

const FIELD_LENGTH = 54; // along Z (goals at +/- 27)
const FIELD_WIDTH = 36; // along X (touchlines at +/- 18)
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 2;
const HALF_W = FIELD_WIDTH / 2;
const HALF_L = FIELD_LENGTH / 2;

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

/** A rectangle outline (four lines) — used for the penalty and goal areas. */
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
  return (
    <group>
      {/* Touchlines + goal lines */}
      <Line z={-HALF_L} sx={FIELD_WIDTH} sz={LINE_W} />
      <Line z={HALF_L} sx={FIELD_WIDTH} sz={LINE_W} />
      <Line x={-HALF_W} sx={LINE_W} sz={FIELD_LENGTH} />
      <Line x={HALF_W} sx={LINE_W} sz={FIELD_LENGTH} />

      {/* Halfway line + centre circle + spot */}
      <Line sx={FIELD_WIDTH} sz={LINE_W} />
      <mesh position={[0, LINE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5 - LINE_W, 5, 64]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
      <mesh position={[0, LINE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color={LINE} />
      </mesh>

      {/* Penalty + goal areas, both ends */}
      <Box z={-HALF_L} end={-1} width={18} depth={6} />
      <Box z={-HALF_L} end={-1} width={10} depth={2.6} />
      <Box z={HALF_L} end={1} width={18} depth={6} />
      <Box z={HALF_L} end={1} width={10} depth={2.6} />
      {/* Penalty spots */}
      <mesh position={[0, LINE_Y, -HALF_L + 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 12]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
      <mesh position={[0, LINE_Y, HALF_L - 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 12]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
    </group>
  );
}

/** Mown stripes across the pitch for a broadcast look. */
function Stripes() {
  const count = 9;
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
          <boxGeometry args={[130, 1, 130]} />
          <meshStandardMaterial color="#1f5f28" />
        </mesh>
      </RigidBody>

      <Stripes />
      <Markings />

      {/* End walls sit BEHIND the goals so they never block the goal mouth. */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, -HALF_L - 4]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, HALF_L + 4]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={[-HALF_W - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]}
          visible={false}
        >
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, FIELD_LENGTH + 10]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          position={[HALF_W + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]}
          visible={false}
        >
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, FIELD_LENGTH + 10]} />
        </mesh>
      </RigidBody>
    </>
  );
}

export const FIELD_DIMENSIONS = { length: FIELD_LENGTH, width: FIELD_WIDTH };
