import { useEffect, useRef, useState } from "react";
import { virtualInput, resetVirtualInput } from "@/game/systems/virtualInput";

const STICK_RADIUS = 70; // px
const DEAD_ZONE = 0.14;
const EXPO = 1.35; // >1 = finer control near the centre
const SPRINT_AT = 0.92; // full extension sprints

interface StickState {
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
  mag: number; // 0..1 after processing
}

/**
 * Touch controls tuned for phones:
 * - DYNAMIC joystick: touch anywhere on the left half and the stick appears
 *   under your thumb (no reaching for a fixed corner).
 * - Dead zone + expo response curve for fine close control; pushing to full
 *   extension sprints (the ring lights up).
 * - Big Pass / Shoot buttons with pressed feedback on the right.
 */
export function TouchControls() {
  const [stick, setStick] = useState<StickState | null>(null);
  const pointerId = useRef<number | null>(null);

  // Clear any held stick/buttons if the controls unmount (e.g. switching mode).
  useEffect(() => resetVirtualInput, []);

  const applyStick = (baseX: number, baseY: number, x: number, y: number) => {
    let dx = x - baseX;
    let dy = y - baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS;
      dy = (dy / dist) * STICK_RADIUS;
    }
    const raw = Math.min(1, dist / STICK_RADIUS);
    // Dead zone, then expo curve on the remaining range.
    const t = raw < DEAD_ZONE ? 0 : (raw - DEAD_ZONE) / (1 - DEAD_ZONE);
    const mag = Math.pow(t, EXPO);

    setStick({ baseX, baseY, dx, dy, mag });
    if (mag === 0) {
      virtualInput.moveX = 0;
      virtualInput.moveY = 0;
      virtualInput.sprint = false;
      return;
    }
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    virtualInput.active = true;
    virtualInput.moveX = nx * mag;
    virtualInput.moveY = ny * mag; // screen down = +Z-ish; input system remaps
    virtualInput.sprint = raw >= SPRINT_AT;
  };

  const endStick = () => {
    pointerId.current = null;
    setStick(null);
    virtualInput.moveX = 0;
    virtualInput.moveY = 0;
    virtualInput.sprint = false;
  };

  const sprinting = stick ? stick.mag > 0 && virtualInput.sprint : false;

  return (
    <>
      {/* Left half: dynamic joystick zone */}
      <div
        className="pointer-events-auto absolute inset-y-0 left-0 w-1/2 touch-none select-none"
        onPointerDown={(e) => {
          if (pointerId.current !== null) return;
          pointerId.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointerId.current !== e.pointerId || !stick) return;
          applyStick(stick.baseX, stick.baseY, e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (pointerId.current === e.pointerId) endStick();
        }}
        onPointerCancel={(e) => {
          if (pointerId.current === e.pointerId) endStick();
        }}
      >
        {stick && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: stick.baseX - STICK_RADIUS,
              top: stick.baseY - STICK_RADIUS,
              width: STICK_RADIUS * 2,
              height: STICK_RADIUS * 2,
            }}
          >
            {/* Base ring — lights up when sprinting */}
            <div
              className={`absolute inset-0 rounded-full backdrop-blur-sm transition-colors ${
                sprinting
                  ? "bg-yellow-300/20 ring-2 ring-yellow-300/70"
                  : "bg-white/10 ring-2 ring-white/30"
              }`}
            />
            {/* Knob */}
            <div
              className="absolute rounded-full bg-white/80 shadow-lg"
              style={{
                width: STICK_RADIUS * 0.9,
                height: STICK_RADIUS * 0.9,
                left: STICK_RADIUS * 0.55 + stick.dx,
                top: STICK_RADIUS * 0.55 + stick.dy,
              }}
            />
          </div>
        )}
        {!stick && (
          <div className="absolute bottom-10 left-8 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/60 backdrop-blur-sm">
            Touch &amp; drag to move
          </div>
        )}
      </div>

      {/* Action buttons (right) */}
      <div
        className="pointer-events-auto absolute bottom-8 right-5 flex touch-none select-none flex-col items-end gap-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ActionButton
          label="SHOOT"
          size={92}
          color="bg-red-500/85"
          onDown={() => (virtualInput.shootHeld = true)}
          onUp={() => (virtualInput.shootHeld = false)}
        />
        <ActionButton
          label="PASS"
          size={74}
          color="bg-sky-500/85"
          onDown={() => (virtualInput.passRequested = true)}
        />
      </div>
    </>
  );
}

function ActionButton({
  label,
  size,
  color,
  onDown,
  onUp,
}: {
  label: string;
  size: number;
  color: string;
  onDown: () => void;
  onUp?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      className={`rounded-full font-black text-white shadow-xl ring-2 backdrop-blur-sm transition-transform ${color} ${
        pressed ? "scale-90 ring-white/80 brightness-125" : "ring-white/30"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.2 }}
      onPointerDown={(e) => {
        e.preventDefault();
        setPressed(true);
        onDown();
      }}
      onPointerUp={() => {
        setPressed(false);
        onUp?.();
      }}
      onPointerCancel={() => {
        setPressed(false);
        onUp?.();
      }}
      onPointerLeave={() => {
        if (pressed) {
          setPressed(false);
          onUp?.();
        }
      }}
    >
      {label}
    </button>
  );
}
