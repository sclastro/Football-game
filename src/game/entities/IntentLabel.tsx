import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { labelTexture } from "@/game/utils/textures";
import { useGameStore } from "@/game/state/gameStore";
import type { Behaviour, PlayerRecord } from "@/game/systems/worldRegistry";

/** Human-readable name and colour for each behaviour. */
const LABELS: Record<Behaviour, { text: string; color: string }> = {
  idle: { text: "idle", color: "#94a3b8" },
  you: { text: "you", color: "#fde047" },
  carry: { text: "on the ball", color: "#fde047" },
  chase: { text: "chasing", color: "#fb923c" },
  support: { text: "making a run", color: "#4ade80" },
  press: { text: "pressing", color: "#f87171" },
  cover: { text: "covering lane", color: "#c084fc" },
  intercept: { text: "intercepting", color: "#f472b6" },
  shape: { text: "holding shape", color: "#60a5fa" },
  keeper: { text: "keeping", color: "#22d3ee" },
  walkout: { text: "walking out", color: "#94a3b8" },
};

const ORDER: Behaviour[] = [
  "idle",
  "you",
  "carry",
  "chase",
  "support",
  "press",
  "cover",
  "intercept",
  "shape",
  "keeper",
  "walkout",
];

/**
 * Debug read-out floating above a player showing what the AI has decided to do
 * this frame. Off by default; toggled from the in-match settings menu.
 *
 * All eleven label textures are built once and swapped by index, so switching
 * behaviour costs nothing per frame.
 */
export function IntentLabel({
  record,
  controlled,
}: {
  record: PlayerRecord;
  controlled: boolean;
}) {
  const show = useGameStore((s) => s.showIntent);
  const meshRef = useRef<THREE.Mesh>(null);
  const current = useRef<Behaviour | null>(null);

  const textures = useMemo(
    () =>
      ORDER.map((b) => labelTexture(LABELS[b].text, LABELS[b].color)),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !show) return;
    const behaviour: Behaviour = controlled ? "you" : record.ai.behaviour;
    if (behaviour === current.current) return;
    current.current = behaviour;
    const idx = Math.max(0, ORDER.indexOf(behaviour));
    (mesh.material as THREE.MeshBasicMaterial).map = textures[idx];
    (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
  });

  if (!show) return null;

  return (
    <Billboard position={[0, 1.95, 0]}>
      <mesh ref={meshRef}>
        <planeGeometry args={[1.15, 0.43]} />
        <meshBasicMaterial map={textures[0]} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}
