import { useEffect, useRef, useState } from "react";
import { virtualInput, resetVirtualInput } from "@/game/systems/virtualInput";

const STICK_RADIUS = 70; // px — movement stick
const DEAD_ZONE = 0.14;
const EXPO = 1.35; // >1 = finer control near the centre
const SPRINT_AT = 0.92; // full extension sprints

const SHOOT_RADIUS = 62; // px — shoot/aim stick
const SHOOT_DEAD = 0.12; // below this a release is a tap (facing kick)

interface StickState {
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
  mag: number; // 0..1 after processing
}

/**
 * Touch controls tuned for phones:
 * - LEFT: dynamic movement joystick — touch anywhere on the left half and the
 *   stick appears under your thumb; dead zone + expo for fine control; push to
 *   full extension to sprint (the ring lights up).
 * - RIGHT: a single SHOOT stick — drag it in a direction to aim, release to
 *   kick. A small drag is a short pass, a big drag is a shot: one control does
 *   both (no separate pass/shoot buttons).
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
      {/* Left half: dynamic movement joystick */}
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

      {/* Right: single SHOOT / aim stick */}
      <ShootStick />
    </>
  );
}

/**
 * Fixed-base aim stick. Drag from the pad to aim, release to kick. The drag
 * length sets the power (short = pass, long = shot) and the drag direction sets
 * where the ball goes, so you can shoot to the right while running left.
 */
function ShootStick() {
  const pid = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [knob, setKnob] =
    useState<{ dx: number; dy: number; mag: number } | null>(null);

  const update = (x: number, y: number) => {
    let dx = x - center.current.x;
    let dy = y - center.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > SHOOT_RADIUS) {
      dx = (dx / dist) * SHOOT_RADIUS;
      dy = (dy / dist) * SHOOT_RADIUS;
    }
    const mag = Math.min(1, dist / SHOOT_RADIUS);
    setKnob({ dx, dy, mag });
    const nd = Math.hypot(dx, dy) || 1;
    virtualInput.shootHeld = true;
    virtualInput.shootAimX = (dx / nd) * mag;
    virtualInput.shootAimY = (dy / nd) * mag;
  };

  const end = (k: { dx: number; dy: number; mag: number } | null) => {
    const mag = k ? k.mag : 0;
    if (k && mag > SHOOT_DEAD) {
      const nd = Math.hypot(k.dx, k.dy) || 1;
      virtualInput.fireAimX = k.dx / nd;
      virtualInput.fireAimY = k.dy / nd;
    } else {
      virtualInput.fireAimX = 0;
      virtualInput.fireAimY = 0;
    }
    virtualInput.firePower = mag;
    virtualInput.shootFired = true;
    virtualInput.shootHeld = false;
    virtualInput.shootAimX = 0;
    virtualInput.shootAimY = 0;
    setKnob(null);
    pid.current = null;
  };

  const power = knob ? knob.mag : 0;
  const shooting = power > 0.55; // red once it's a real strike

  return (
    <div
      className="pointer-events-auto absolute touch-none select-none rounded-full"
      style={{
        right: "2rem",
        bottom: "calc(2.5rem + env(safe-area-inset-bottom))",
        width: SHOOT_RADIUS * 2,
        height: SHOOT_RADIUS * 2,
      }}
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pid.current === e.pointerId) end(knob);
      }}
      onPointerCancel={(e) => {
        if (pid.current === e.pointerId) end(knob);
      }}
    >
      {/* Base ring — tints from blue (pass) to red (shot) with power */}
      <div
        className={`absolute inset-0 rounded-full backdrop-blur-sm transition-colors ${
          shooting
            ? "bg-red-500/30 ring-2 ring-red-400/80"
            : power > 0
              ? "bg-sky-500/25 ring-2 ring-sky-300/70"
              : "bg-red-500/25 ring-2 ring-white/40"
        }`}
      />
      {/* Label / knob */}
      {knob ? (
        <div
          className="absolute rounded-full bg-white/85 shadow-lg"
          style={{
            width: SHOOT_RADIUS * 0.72,
            height: SHOOT_RADIUS * 0.72,
            left: SHOOT_RADIUS * 0.64 + knob.dx,
            top: SHOOT_RADIUS * 0.64 + knob.dy,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black tracking-wide text-white drop-shadow">
            SHOOT
          </span>
        </div>
      )}
    </div>
  );
}
