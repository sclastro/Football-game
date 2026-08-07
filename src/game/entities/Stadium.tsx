import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { FIELD_DIMENSIONS } from "./Field";
import { TEAMS } from "@/game/data/teams";
import { useGameStore } from "@/game/state/gameStore";

const { width, length } = FIELD_DIMENSIONS;

// The pitch is large, so the crowd is spaced out and the rake shortened to keep
// the total instance count near what it was on the old, smaller pitch.
const MARGIN = 3.5; // gap between touchline and stand front
const ROWS = 8;
const ROW_RISE = 0.8;
const ROW_DEPTH = 1.0;
const SPACING = 1.25;
const FRONT_H = 1.2;

const CROWD_PALETTE = [
  "#e63946", "#f1faee", "#a8dadc", "#457b9d", "#ffb703", "#fb8500",
  "#8ecae6", "#e9c46a", "#2a9d8f", "#e76f51", "#cdb4db", "#bde0fe",
  "#ff006e", "#3a86ff", "#ffbe0b",
];
const SKIN = ["#f3c9a0", "#e6b088", "#c98a5e", "#a56a3d", "#8a5a34"];

interface Person {
  position: [number, number, number];
  color: THREE.Color;
  skin: THREE.Color;
}

function buildSide(
  count: number,
  toWorld: (along: number, back: number, height: number) => [number, number, number],
): Person[] {
  const people: Person[] = [];
  for (let row = 0; row < ROWS; row++) {
    const back = row * ROW_DEPTH;
    const height = FRONT_H + row * ROW_RISE;
    for (let i = 0; i < count; i++) {
      const along = (i - (count - 1) / 2) * SPACING + (Math.random() - 0.5) * 0.2;
      people.push({
        position: toWorld(along, back, height),
        color: new THREE.Color(
          CROWD_PALETTE[Math.floor(Math.random() * CROWD_PALETTE.length)],
        ),
        skin: new THREE.Color(SKIN[Math.floor(Math.random() * SKIN.length)]),
      });
    }
  }
  return people;
}

/**
 * Waving flags dotted through the crowd, tinted to the two teams' colours.
 *
 * A sparse scatter reads far better than one flag per seat: it looks like
 * supporters holding them up rather than bunting. They wave on a per-flag phase
 * so the stand ripples instead of flapping in unison.
 */
function CrowdFlags({
  people,
  homeColor,
  awayColor,
}: {
  people: Person[];
  homeColor: string;
  awayColor: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // One flag every ~14th spectator, with a stable random phase each.
  const flags = useMemo(() => {
    const out: { position: [number, number, number]; phase: number; home: boolean }[] =
      [];
    for (let i = 0; i < people.length; i += 14) {
      const p = people[i];
      out.push({
        position: [p.position[0], p.position[1] + 1.1, p.position[2]],
        phase: Math.random() * Math.PI * 2,
        home: Math.random() < 0.5,
      });
    }
    return out;
  }, [people]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorRef = useRef(false);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i];
      dummy.position.set(...f.position);
      // Rock side to side and twist, like a flag being waved overhead.
      dummy.rotation.set(0, Math.sin(t * 2 + f.phase) * 0.5, Math.sin(t * 3 + f.phase) * 0.35);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Colours only need writing once — they never change during a match.
    if (!colorRef.current) {
      const home = new THREE.Color(homeColor);
      const away = new THREE.Color(awayColor);
      flags.forEach((f, i) => mesh.setColorAt(i, f.home ? home : away));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      colorRef.current = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, flags.length]}>
      <planeGeometry args={[0.85, 0.55]} />
      <meshStandardMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

/** Tiered stadium bowl: raked decks, roofs, and an instanced crowd (bodies + heads). */
export function Stadium() {
  const halfW = width / 2 + MARGIN;
  const halfL = length / 2 + MARGIN;
  const deckDepth = ROWS * ROW_DEPTH + 1.5;
  const topH = FRONT_H + ROWS * ROW_RISE;
  const homeColor = TEAMS[useGameStore((s) => s.homeTeamId)].kitColor;
  const awayColor = TEAMS[useGameStore((s) => s.awayTeamId)].kitColor;

  const people = useMemo(() => {
    const perLong = Math.floor((length + 8) / SPACING);
    const perShort = Math.floor((width + 8) / SPACING);
    // NOTE: no crowd on the +X touchline — the broadcast camera sits there, so
    // that stand would block the view (it's "behind" the camera in real life).
    return [
      ...buildSide(perLong, (a, b, h) => [-halfW - b, h, a]),
      ...buildSide(perShort, (a, b, h) => [a, h, halfL + b]),
      ...buildSide(perShort, (a, b, h) => [a, h, -halfL - b]),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bodyRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const d = new THREE.Object3D();
    people.forEach((p, i) => {
      d.position.set(...p.position);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, p.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const headRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const d = new THREE.Object3D();
    people.forEach((p, i) => {
      d.position.set(p.position[0], p.position[1] + 0.62, p.position[2]);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, p.skin);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // One raked deck slab + facade + roof per side.
  function Stand({
    cx,
    cz,
    along,
    horizontal,
  }: {
    cx: number;
    cz: number;
    along: number;
    horizontal: boolean;
  }) {
    const size: [number, number, number] = horizontal
      ? [deckDepth, topH + 1, along]
      : [along, topH + 1, deckDepth];
    const roofSize: [number, number, number] = horizontal
      ? [deckDepth + 1, 0.3, along + 1]
      : [along + 1, 0.3, deckDepth + 1];
    const off = horizontal ? Math.sign(cx) : Math.sign(cz);
    const roofPos: [number, number, number] = horizontal
      ? [cx + off * 1.5, topH + 2.4, cz]
      : [cx, topH + 2.4, cz + off * 1.5];
    return (
      <group>
        {/* Deck (behind the seats, hides the underside) */}
        <mesh position={[cx, (topH + 1) / 2 - 0.5, cz]} receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color="#57606a" />
        </mesh>
        {/* Roof canopy */}
        <mesh position={roofPos} castShadow>
          <boxGeometry args={roofSize} />
          <meshStandardMaterial color="#2f3640" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  const backW = halfW + deckDepth * 0.6;
  const backL = halfL + deckDepth * 0.6;

  return (
    <group>
      {/* Near (+X) stand intentionally omitted — the camera sits there. */}
      <Stand cx={-backW} cz={0} along={length + 10} horizontal />
      <Stand cx={0} cz={backL} along={width + 10} horizontal={false} />
      <Stand cx={0} cz={-backL} along={width + 10} horizontal={false} />

      <CrowdFlags
        people={people}
        homeColor={homeColor}
        awayColor={awayColor}
      />

      {/* Crowd */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, people.length]}>
        <boxGeometry args={[0.55, 0.85, 0.55]} />
        <meshStandardMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, people.length]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
