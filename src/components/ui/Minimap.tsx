import { useEffect, useRef } from "react";
import { FIELD_DIMENSIONS } from "@/game/entities/Field";
import {
  ballPosition,
  playerRegistry,
} from "@/game/systems/worldRegistry";
import { useGameStore } from "@/game/state/gameStore";
import { TEAMS } from "@/game/data/teams";

const HALF_W = FIELD_DIMENSIONS.width / 2;
const HALF_L = FIELD_DIMENSIONS.length / 2;

/** On-screen size. The pitch is drawn lengthwise, matching the camera. */
const MAP_W = 138;
const MAP_H = 92;

/**
 * Live radar of the whole pitch.
 *
 * The match camera is deliberately close now, which means most of the pitch is
 * off-screen at any moment — so there has to be somewhere to see the shape of
 * both teams. It draws straight from the world registry on an animation frame
 * rather than through React, because it updates every single frame.
 */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const homeTeamId = useGameStore((s) => s.homeTeamId);
  const awayTeamId = useGameStore((s) => s.awayTeamId);
  const controlledId = useGameStore((s) => s.controlledPlayerId);

  const colors = useRef({ home: "#3b82f6", away: "#ef4444", controlled: controlledId });
  colors.current = {
    home: TEAMS[homeTeamId]?.kitColor ?? "#3b82f6",
    away: TEAMS[awayTeamId]?.kitColor ?? "#ef4444",
    controlled: controlledId,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    // World X spans the map's width, world Z its height. Home defends +Z, which
    // is the bottom of the map — the same way round as the camera sees it.
    const toX = (x: number) => ((x + HALF_W) / (HALF_W * 2)) * MAP_W;
    const toY = (z: number) => ((z + HALF_L) / (HALF_L * 2)) * MAP_H;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, MAP_W, MAP_H);

      // Pitch
      ctx.fillStyle = "rgba(10, 40, 18, 0.82)";
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(1.5, 1.5, MAP_W - 3, MAP_H - 3);
      ctx.beginPath();
      ctx.moveTo(1.5, MAP_H / 2);
      ctx.lineTo(MAP_W - 1.5, MAP_H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(MAP_W / 2, MAP_H / 2, MAP_H * 0.13, 0, Math.PI * 2);
      ctx.stroke();

      for (const rec of playerRegistry.values()) {
        const x = toX(rec.position.x);
        const y = toY(rec.position.z);
        const isYou = rec.id === colors.current.controlled;
        ctx.beginPath();
        ctx.arc(x, y, isYou ? 3.4 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle =
          rec.team === "home" ? colors.current.home : colors.current.away;
        ctx.fill();
        if (isYou) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      const ball = ballPosition();
      if (ball) {
        ctx.beginPath();
        ctx.arc(toX(ball.x), toY(ball.z), 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-md ring-1 ring-white/25 shadow-lg"
      style={{ width: MAP_W, height: MAP_H, opacity: 0.92 }}
    />
  );
}
