import { RigidBody } from "@react-three/rapier";

const GOAL_WIDTH = 7.4;
const GOAL_HEIGHT = 2.6;
const POST_THICKNESS = 0.14;
const GOAL_DEPTH = 1.5;

interface GoalProps {
  /** Which goal line this goal sits on: -1 = -Z goal, +1 = +Z goal. */
  end: -1 | 1;
  /** Z of the goal line (magnitude). */
  lineZ: number;
}

/**
 * Goal frame: posts, crossbar and a netted back/side box. Scoring is detected
 * separately by ball position (see goalDetectionSystem), so a goal only counts
 * once the ball has fully crossed the line between the posts.
 */
export function Goal({ end, lineZ }: GoalProps) {
  const z = lineZ * end;
  const back = z + end * GOAL_DEPTH;
  const netMat = (
    <meshStandardMaterial color="#f0f0f0" transparent opacity={0.28} />
  );

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

      {/* Netting: back panel (stops the ball) + two sides + roof, translucent. */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, GOAL_HEIGHT / 2, back]}>
          <boxGeometry args={[GOAL_WIDTH, GOAL_HEIGHT, 0.06]} />
          {netMat}
        </mesh>
      </RigidBody>
      <mesh position={[-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, z + (end * GOAL_DEPTH) / 2]}>
        <boxGeometry args={[0.04, GOAL_HEIGHT, GOAL_DEPTH]} />
        {netMat}
      </mesh>
      <mesh position={[GOAL_WIDTH / 2, GOAL_HEIGHT / 2, z + (end * GOAL_DEPTH) / 2]}>
        <boxGeometry args={[0.04, GOAL_HEIGHT, GOAL_DEPTH]} />
        {netMat}
      </mesh>
      <mesh position={[0, GOAL_HEIGHT, z + (end * GOAL_DEPTH) / 2]}>
        <boxGeometry args={[GOAL_WIDTH, 0.04, GOAL_DEPTH]} />
        {netMat}
      </mesh>
    </group>
  );
}

export const GOAL_DIMENSIONS = { width: GOAL_WIDTH, height: GOAL_HEIGHT };
