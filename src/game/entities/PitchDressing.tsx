import { FIELD_DIMENSIONS } from "./Field";
import { GOAL_DIMENSIONS } from "./Goal";

const HALF_W = FIELD_DIMENSIONS.width / 2;
const HALF_L = FIELD_DIMENSIONS.length / 2;
const BOARD_OUT = 0.5; // distance outside the line
const BOARD_H = 0.62;

// Goal-line hoardings run from beside the goal out to the corner. Derived from
// the real goal width so they always leave a correct gap around the posts.
const GOAL_GAP = GOAL_DIMENSIONS.width / 2 + 1.5;
const END_BOARD_LEN = Math.max(2, HALF_W - GOAL_GAP - 1.5);
const END_BOARD_X = GOAL_GAP + END_BOARD_LEN / 2;

/** A pitch-side advertising hoarding: dark base with a bright top strip. */
function Board({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, BOARD_H / 2, 0]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#12213f" />
      </mesh>
      <mesh position={[0, BOARD_H - 0.08, 0]}>
        <boxGeometry args={[size[0] + 0.01, 0.16, size[2] + 0.01]} />
        <meshStandardMaterial color="#3a86ff" emissive="#1b3a7a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** A corner flag: pole + small triangle-ish flag. */
function CornerFlag({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
        <meshStandardMaterial color="#dddddd" />
      </mesh>
      <mesh position={[Math.sign(x) * -0.18, 1.05, 0]}>
        <boxGeometry args={[0.32, 0.22, 0.02]} />
        <meshStandardMaterial color="#ffd400" />
      </mesh>
    </group>
  );
}

/** Decorative ring of hoardings + corner flags around the pitch (visual only). */
export function PitchDressing() {
  return (
    <group>
      {/* Long sides */}
      <Board
        position={[HALF_W + BOARD_OUT, 0, 0]}
        size={[0.12, BOARD_H, HALF_L * 2 - 6]}
      />
      <Board
        position={[-HALF_W - BOARD_OUT, 0, 0]}
        size={[0.12, BOARD_H, HALF_L * 2 - 6]}
      />
      {/* Goal-line sides (split to leave room for the goals) */}
      {[-1, 1].map((s) =>
        [-1, 1].map((side) => (
          <Board
            key={`${s}-${side}`}
            position={[side * END_BOARD_X, 0, s * (HALF_L + BOARD_OUT)]}
            size={[END_BOARD_LEN, BOARD_H, 0.12]}
          />
        )),
      )}

      <CornerFlag x={HALF_W} z={HALF_L} />
      <CornerFlag x={-HALF_W} z={HALF_L} />
      <CornerFlag x={HALF_W} z={-HALF_L} />
      <CornerFlag x={-HALF_W} z={-HALF_L} />
    </group>
  );
}
