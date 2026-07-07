import { useGameStore } from "@/game/state/gameStore";
import { ROSTERS } from "@/game/data/teams";
import { FIELD_DIMENSIONS } from "./Field";

const DUGOUT_X = FIELD_DIMENSIONS.width / 2 + 1.6;
const SEAT_SPACING = 1.1;

/** A seated substitute: blocky mini-figure on the bench. */
function SeatedPlayer({
  position,
  shirtColor,
}: {
  position: [number, number, number];
  shirtColor: string;
}) {
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* Torso (leaning slightly back) */}
      <mesh castShadow position={[0, 0.62, 0]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.45, 0.5, 0.28]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.02, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#f2c299" />
      </mesh>
      {/* Upper legs (seated, pointing forward) */}
      <mesh castShadow position={[0, 0.38, 0.22]}>
        <boxGeometry args={[0.4, 0.16, 0.45]} />
        <meshStandardMaterial color="#263238" />
      </mesh>
      {/* Lower legs */}
      <mesh castShadow position={[0, 0.16, 0.42]}>
        <boxGeometry args={[0.38, 0.34, 0.15]} />
        <meshStandardMaterial color="#263238" />
      </mesh>
    </group>
  );
}

/** The coach: a standing blocky figure in a suit, arms crossed at the technical area. */
function Coach({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* Suit torso */}
      <mesh castShadow position={[0, 0.95, 0]}>
        <boxGeometry args={[0.52, 0.62, 0.3]} />
        <meshStandardMaterial color="#1c1c28" />
      </mesh>
      {/* Crossed arms bar */}
      <mesh castShadow position={[0, 0.98, 0.18]}>
        <boxGeometry args={[0.5, 0.16, 0.14]} />
        <meshStandardMaterial color="#1c1c28" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.46, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#f2c299" />
      </mesh>
      {/* Trousers */}
      <mesh castShadow position={[-0.12, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2c2c3a" />
      </mesh>
      <mesh castShadow position={[0.12, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2c2c3a" />
      </mesh>
    </group>
  );
}

interface DugoutProps {
  /** Centre of this dugout along the touchline. */
  centerZ: number;
  shirtColor: string;
  /** Ids of players currently on this bench (drives how many figures sit). */
  benchIds: string[];
}

/** Dugout: shelter + bench seat + seated subs + the coach standing beside. */
function Dugout({ centerZ, shirtColor, benchIds }: DugoutProps) {
  const width = SEAT_SPACING * 4 + 1;
  return (
    <group position={[DUGOUT_X, 0, centerZ]}>
      {/* Bench seat */}
      <mesh castShadow position={[0.15, 0.35, 0]}>
        <boxGeometry args={[0.7, 0.12, width]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>
      {/* Seat legs */}
      <mesh position={[0.15, 0.17, -width / 2 + 0.3]}>
        <boxGeometry args={[0.5, 0.34, 0.12]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0.15, 0.17, width / 2 - 0.3]}>
        <boxGeometry args={[0.5, 0.34, 0.12]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      {/* Shelter back + roof */}
      <mesh castShadow position={[0.85, 0.9, 0]}>
        <boxGeometry args={[0.1, 1.8, width + 0.4]} />
        <meshStandardMaterial color="#37474f" />
      </mesh>
      <mesh castShadow position={[0.25, 1.85, 0]}>
        <boxGeometry args={[1.4, 0.1, width + 0.4]} />
        <meshStandardMaterial color="#455a64" />
      </mesh>

      {/* Seated substitutes */}
      {benchIds.map((id, i) => (
        <SeatedPlayer
          key={id}
          position={[0.15, 0.05, (i - (benchIds.length - 1) / 2) * SEAT_SPACING]}
          shirtColor={shirtColor}
        />
      ))}

      {/* Coach standing at the edge of the technical area */}
      <Coach position={[-0.6, 0, width / 2 + 1]} />
    </group>
  );
}

/** Both dugouts on the +X touchline; the home bench mirrors live roster state. */
export function Benches({
  homeColor,
  awayColor,
}: {
  homeColor: string;
  awayColor: string;
}) {
  // Subbed-off players swap into this list, so the bench stays visually full.
  const homeBench = useGameStore((s) => s.homeBench);
  const awayBenchIds = ROSTERS.away.bench.map((p) => p.id);

  return (
    <>
      <Dugout centerZ={-8} shirtColor={homeColor} benchIds={homeBench} />
      <Dugout centerZ={8} shirtColor={awayColor} benchIds={awayBenchIds} />
    </>
  );
}
