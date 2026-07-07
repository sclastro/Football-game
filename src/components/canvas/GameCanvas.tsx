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
import { ControlSwitcher } from "@/game/systems/controlSwitchSystem";
import { PassMonitor } from "@/game/systems/passMonitorSystem";
import { FORMATION, homePosition, awayPosition } from "@/game/data/formations";
import { TEAMS, DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, ROSTERS } from "@/game/data/teams";
import { useGameStore } from "@/game/state/gameStore";

const GOAL_LINE_Z = FIELD_DIMENSIONS.length / 2 - 1;

export function GameCanvas() {
  const home = TEAMS[DEFAULT_HOME_TEAM];
  const away = TEAMS[DEFAULT_AWAY_TEAM];
  // Entities are keyed by roster player id, so a substitution unmounts the
  // outgoing player and mounts the incoming one at the slot's spawn point.
  const homeStarters = useGameStore((s) => s.homeStarters);

  return (
    <Canvas camera={{ fov: 55, near: 0.1, far: 300 }}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 40, 10]} intensity={1.1} />

      <Stadium />
      <Benches homeColor={home.kitColor} awayColor={away.kitColor} />
      <MatchClock />
      <ControlSwitcher />
      <PassMonitor />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <Ball />
        {/* Home defends -Z, attacks +Z; away mirrored. */}
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
