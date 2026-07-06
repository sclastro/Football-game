import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { Field, FIELD_DIMENSIONS } from "@/game/entities/Field";
import { Stadium } from "@/game/entities/Stadium";
import { Ball } from "@/game/entities/Ball";
import { Goal } from "@/game/entities/Goal";
import { PlayerEntity } from "@/game/entities/PlayerEntity";
import { MatchClock } from "@/game/systems/matchClockSystem";
import { ControlSwitcher } from "@/game/systems/controlSwitchSystem";
import { FORMATION, homePosition, awayPosition } from "@/game/data/formations";
import { TEAMS, DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM } from "@/game/data/teams";

const GOAL_LINE_Z = FIELD_DIMENSIONS.length / 2 - 1;

export function GameCanvas() {
  const home = TEAMS[DEFAULT_HOME_TEAM];
  const away = TEAMS[DEFAULT_AWAY_TEAM];

  return (
    <Canvas camera={{ fov: 55, near: 0.1, far: 300 }}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 40, 10]} intensity={1.1} />

      <Stadium />
      <MatchClock />
      <ControlSwitcher />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <Ball />
        {/* Home defends -Z, attacks +Z; away mirrored. */}
        <Goal end={-1} lineZ={GOAL_LINE_Z} />
        <Goal end={1} lineZ={GOAL_LINE_Z} />

        {FORMATION.map((slot, i) => (
          <PlayerEntity
            key={`home-${i}`}
            id={`home-${i}`}
            team="home"
            isGoalkeeper={slot.isGoalkeeper}
            color={home.kitColor}
            gkColor="#2e7d32"
            spawnPosition={homePosition(slot)}
          />
        ))}
        {FORMATION.map((slot, i) => (
          <PlayerEntity
            key={`away-${i}`}
            id={`away-${i}`}
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
