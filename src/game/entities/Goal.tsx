import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useGameStore } from "@/game/state/gameStore";

const GOAL_WIDTH = 6;
const GOAL_HEIGHT = 2.2;
const POST_THICKNESS = 0.12;
const GOAL_DEPTH = 1.2;

interface GoalProps {
  /** Which goal line this goal sits on: -1 = home's goal (-Z), +1 = away's (+Z). */
  end: -1 | 1;
  /** Z of the goal line. */
  lineZ: number;
}

/**
 * Goal frame (posts + crossbar + back box) with a sensor across the mouth.
 * The ball entering the sensor scores for the team attacking this end:
 * the ball crossing the away goal (+Z) is a HOME goal, and vice versa.
 */
export function Goal({ end, lineZ }: GoalProps) {
  const scoreGoal = useGameStore((s) => s.scoreGoal);
  // Home attacks -Z, so a goal in the -Z net (end === -1) is a HOME goal.
  const scoringSide = end === -1 ? "home" : "away";
  const z = lineZ * end;
  const back = z + end * GOAL_DEPTH;

  return (
    <group>
      {/* Posts */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow position={[-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, z]}>
          <boxGeometry args={[POST_THICKNESS, GOAL_HEIGHT, POST_THICKNESS]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow position={[GOAL_WIDTH / 2, GOAL_HEIGHT / 2, z]}>
          <boxGeometry args={[POST_THICKNESS, GOAL_HEIGHT, POST_THICKNESS]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </RigidBody>
      {/* Crossbar */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow position={[0, GOAL_HEIGHT, z]}>
          <boxGeometry
            args={[GOAL_WIDTH + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]}
          />
          <meshStandardMaterial color="white" />
        </mesh>
      </RigidBody>
      {/* Net back panel: stops the ball behind the line */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, GOAL_HEIGHT / 2, back]}>
          <boxGeometry args={[GOAL_WIDTH, GOAL_HEIGHT, 0.08]} />
          <meshStandardMaterial color="#e0e0e0" transparent opacity={0.35} />
        </mesh>
      </RigidBody>

      {/* Score sensor: fills the whole goal-box interior (line to net), so even
          a shot fast enough to cross the line in one physics step still registers
          once the net stops it inside the volume. */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[0, GOAL_HEIGHT / 2, z + end * (GOAL_DEPTH / 2 + 0.15)]}
      >
        <CuboidCollider
          args={[GOAL_WIDTH / 2 - 0.1, GOAL_HEIGHT / 2, GOAL_DEPTH / 2]}
          sensor
          onIntersectionEnter={(payload) => {
            const data = payload.other.rigidBody?.userData as
              | { type?: string }
              | undefined;
            if (data?.type === "ball") scoreGoal(scoringSide);
          }}
        />
      </RigidBody>
    </group>
  );
}

export const GOAL_DIMENSIONS = { width: GOAL_WIDTH, height: GOAL_HEIGHT };
