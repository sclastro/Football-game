import { useMemo } from "react";
import * as THREE from "three";
import { FIELD_DIMENSIONS } from "./Field";

const { width, length } = FIELD_DIMENSIONS;

const MARGIN = 3; // gap between touchline and stands
const ROWS = 6; // tiers of seating
const ROW_RISE = 0.8; // height gain per tier
const ROW_DEPTH = 1.1; // how far back each tier steps
const SPACING = 1.2; // gap between spectators along a row

const CROWD_PALETTE = [
  "#e63946", "#f1faee", "#a8dadc", "#457b9d", "#ffb703",
  "#fb8500", "#8ecae6", "#e9c46a", "#2a9d8f", "#e76f51",
];

interface Spectator {
  position: [number, number, number];
  color: THREE.Color;
}

/** Builds tiered rows of crowd boxes along one side of the pitch. */
function buildSide(
  count: number,
  toWorld: (along: number, back: number, height: number) => [number, number, number],
): Spectator[] {
  const spectators: Spectator[] = [];
  for (let row = 0; row < ROWS; row++) {
    const back = row * ROW_DEPTH;
    const height = 1 + row * ROW_RISE;
    for (let i = 0; i < count; i++) {
      const along = (i - (count - 1) / 2) * SPACING;
      spectators.push({
        position: toWorld(along, back, height),
        color: new THREE.Color(
          CROWD_PALETTE[Math.floor(Math.random() * CROWD_PALETTE.length)],
        ),
      });
    }
  }
  return spectators;
}

/** Low-poly stadium: concrete stand slabs on all four sides + an instanced crowd. */
export function Stadium() {
  const spectators = useMemo(() => {
    const halfW = width / 2 + MARGIN;
    const halfL = length / 2 + MARGIN;
    const perLong = Math.floor(length / SPACING);
    const perShort = Math.floor(width / SPACING);

    return [
      // +X touchline (long side)
      ...buildSide(perLong, (along, back, h) => [halfW + back, h, along]),
      // -X touchline (long side)
      ...buildSide(perLong, (along, back, h) => [-halfW - back, h, along]),
      // +Z goal line (short side)
      ...buildSide(perShort, (along, back, h) => [along, h, halfL + back]),
      // -Z goal line (short side)
      ...buildSide(perShort, (along, back, h) => [along, h, -halfL - back]),
    ];
  }, []);

  const instancedRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    spectators.forEach((s, i) => {
      dummy.position.set(...s.position);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, s.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const halfW = width / 2 + MARGIN;
  const halfL = length / 2 + MARGIN;
  const standWidth = ROWS * ROW_DEPTH + 2;

  return (
    <group>
      {/* Concrete stand slabs (sloped platforms under the crowd) */}
      <mesh position={[halfW + standWidth / 2 - 1, ROWS * ROW_RISE * 0.4, 0]}>
        <boxGeometry args={[standWidth, ROWS * ROW_RISE, length + MARGIN * 2]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[-halfW - standWidth / 2 + 1, ROWS * ROW_RISE * 0.4, 0]}>
        <boxGeometry args={[standWidth, ROWS * ROW_RISE, length + MARGIN * 2]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, ROWS * ROW_RISE * 0.4, halfL + standWidth / 2 - 1]}>
        <boxGeometry args={[width + MARGIN * 2, ROWS * ROW_RISE, standWidth]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, ROWS * ROW_RISE * 0.4, -halfL - standWidth / 2 + 1]}>
        <boxGeometry args={[width + MARGIN * 2, ROWS * ROW_RISE, standWidth]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      {/* Instanced crowd */}
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, spectators.length]}
      >
        <boxGeometry args={[0.6, 0.9, 0.6]} />
        <meshStandardMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
