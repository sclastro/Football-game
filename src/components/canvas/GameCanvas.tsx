import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PHYSICS_CONFIG } from "@/game/physics/physicsConfig";
import { Field, FIELD_DIMENSIONS } from "@/game/entities/Field";
import { Stadium } from "@/game/entities/Stadium";
import { PitchDressing } from "@/game/entities/PitchDressing";
import { Ball } from "@/game/entities/Ball";
import { Goal } from "@/game/entities/Goal";
import { PlayerEntity } from "@/game/entities/PlayerEntity";
import { Benches } from "@/game/entities/Bench";
import { MatchClock } from "@/game/systems/matchClockSystem";
import { PossessionController } from "@/game/systems/possessionSystem";
import { CameraRig } from "@/game/systems/cameraSystem";
import { FORMATION, homePosition, awayPosition } from "@/game/data/formations";
import { TEAMS } from "@/game/data/teams";
import { useGameStore } from "@/game/state/gameStore";

const GOAL_LINE_Z = FIELD_DIMENSIONS.length / 2;

export function GameCanvas() {
  const home = TEAMS[useGameStore((s) => s.homeTeamId)];
  const away = TEAMS[useGameStore((s) => s.awayTeamId)];
  // Entities are keyed by roster player id, so changing the squad unmounts the
  // outgoing player and mounts the incoming one at the slot's spawn point.
  const homeSquad = useGameStore((s) => s.homeSquad);
  const awaySquad = useGameStore((s) => s.awaySquad);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 50, near: 0.1, far: 400 }}
    >
      <color attach="background" args={["#8ec9e8"]} />
      <fog attach="fog" args={["#a9d3ea", 80, 210]} />
      <hemisphereLight args={["#eaf4ff", "#3f5f34", 0.65]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[30, 50, 22]}
        intensity={1.5}
        color="#fff6e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      {/* Cool fill from the far side to soften shadows */}
      <directionalLight position={[-30, 24, -18]} intensity={0.35} color="#bcd4ff" />

      <CameraRig />
      <Stadium />
      <PitchDressing />
      <Benches homeColor={home.kitColor} awayColor={away.kitColor} />
      <MatchClock />
      <PossessionController />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Field />
        <Ball />
        {/* Home attacks -Z, away attacks +Z. */}
        <Goal end={-1} lineZ={GOAL_LINE_Z} />
        <Goal end={1} lineZ={GOAL_LINE_Z} />

        {FORMATION.map((slot, i) =>
          homeSquad[i] ? (
            <PlayerEntity
              key={homeSquad[i]}
              id={homeSquad[i]}
              team="home"
              isGoalkeeper={slot.isGoalkeeper}
              color={home.kitColor}
              accentColor={home.accentColor}
              gkColor="#2e7d32"
              spawnPosition={homePosition(slot)}
            />
          ) : null,
        )}
        {FORMATION.map((slot, i) =>
          awaySquad[i] ? (
            <PlayerEntity
              key={awaySquad[i]}
              id={awaySquad[i]}
              team="away"
              isGoalkeeper={slot.isGoalkeeper}
              color={away.kitColor}
              accentColor={away.accentColor}
              gkColor="#f57f17"
              spawnPosition={awayPosition(slot)}
            />
          ) : null,
        )}
      </Physics>
    </Canvas>
  );
}
