import { RigidBody } from "@react-three/rapier";

const FIELD_LENGTH = 60; // along Z
const FIELD_WIDTH = 40; // along X
const WALL_HEIGHT = 4;

/** Static pitch: ground plane + invisible boundary walls so the ball/players stay in play. */
export function Field() {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid" friction={0.9}>
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[FIELD_WIDTH, 1, FIELD_LENGTH]} />
          <meshStandardMaterial color="#2e7d32" />
        </mesh>
      </RigidBody>

      {/* Simple pitch line markings */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.9, 5, 64]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH - 0.2, 0.15]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Boundary walls (invisible) to keep ball/players on the pitch */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, -FIELD_LENGTH / 2]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH, WALL_HEIGHT, 0.5]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, WALL_HEIGHT / 2, FIELD_LENGTH / 2]} visible={false}>
          <boxGeometry args={[FIELD_WIDTH, WALL_HEIGHT, 0.5]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-FIELD_WIDTH / 2, WALL_HEIGHT / 2, 0]} visible={false}>
          <boxGeometry args={[0.5, WALL_HEIGHT, FIELD_LENGTH]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[FIELD_WIDTH / 2, WALL_HEIGHT / 2, 0]} visible={false}>
          <boxGeometry args={[0.5, WALL_HEIGHT, FIELD_LENGTH]} />
        </mesh>
      </RigidBody>
    </>
  );
}

export const FIELD_DIMENSIONS = { length: FIELD_LENGTH, width: FIELD_WIDTH };
