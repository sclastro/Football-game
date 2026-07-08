import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { Field, FIELD_DIMENSIONS } from "@/game/entities/Field";
import { Stadium } from "@/game/entities/Stadium";
import { Ball } from "@/game/entities/Ball";
import { Goal } from "@/game/entities/Goal";
import { PlayerEntity } from "@/game/entities/PlayerEntity";
import { Benches } from "@/game/entities/Bench";
import { MatchClock } from "@/game/systems/matchClockSystem";
import { PassMonitor } from "@/game/systems/passMonitorSystem";
import { FORMATION, homePosition, awayPosition } from "@/game/data/formations";
import { TEAMS, ROSTERS } from "@/game/data/teams";
import { useGameStore } from "@/game/state/gameStore";

const GOAL_LINE_Z = FIELD_DIMENSIONS.length / 2;

export function GameCanvas() {
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  // Entities are keyed by roster player id, so a substitution unmounts the
  // outgoing player and mounts the incoming one at the slot's spawn point.
  const homeStarters = useGameStore((s) => s.homeStarters);

  return (
    <Canvas camera={{ fov: 52, near: 0.1, far: 400 }}>
      <color attach="background" args={["#8ec9e8"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[24, 40, 20]} intensity={1.15} />

      <Stadium />
      <Benches homeColor={home.kitColor} awayColor={away.kitColor} />
      <MatchClock />
      <PassMonitor />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <Ball />
        {/* Home attacks -Z, away attacks +Z. */}
        <Goal end={-1} lineZ={GOAL_LINE_Z} />
        <Goal end={1} lineZ={GOAL_LINE_Z} />

        {FORMATION.map((slot, i) => (
          <PlayerEntity
            key={homeStarters[i]}
            id={homeStarters[i]}
            team="home"
            isGoalkeeper={slot.isGoalkeeper}
            color={home.kitColor}
            gkColor="#2e7d32"
            spawnPosition={homePosition(slot)}
          />
        ))}
        {FORMATION.map((slot, i) => (
          <PlayerEntity
            key={ROSTERS.away.starters[i].id}
            id={ROSTERS.away.starters[i].id}
            team="away"
            isGoalkeeper={slot.isGoalkeeper}
            color={away.kitColor}
            gkColor="#f57f17"
            spawnPosition={awayPosition(slot)}
          />
        ))}
      </Physics>
    </Canvas>
  );
}
