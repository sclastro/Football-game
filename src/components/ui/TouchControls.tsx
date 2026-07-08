import { useEffect, useRef, useState } from "react";
import { virtualInput, resetVirtualInput } from "@/game/systems/virtualInput";

const STICK_RADIUS = 60; // px

/**
 * On-screen controls for touch devices: a drag joystick on the left (writes the
 * movement vector) and Pass / Shoot buttons on the right. Screen up = -Z
 * (forward up the pitch), matching the keyboard mapping.
 */
export function TouchControls() {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeTouch = useRef<number | null>(null);

  // Clear any held stick/buttons if the controls unmount (e.g. switching mode).
  useEffect(() => resetVirtualInput, []);

  const updateFromTouch = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS;
      dy = (dy / dist) * STICK_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    virtualInput.active = true;
    virtualInput.moveX = dx / STICK_RADIUS;
    virtualInput.moveY = dy / STICK_RADIUS; // screen down = +Z; up = -Z
    virtualInput.sprint = dist > STICK_RADIUS * 0.92;
  };

  const endStick = () => {
    activeTouch.current = null;
    setKnob({ x: 0, y: 0 });
    virtualInput.moveX = 0;
    virtualInput.moveY = 0;
    virtualInput.sprint = false;
  };

  return (
    <>
      {/* Joystick (left) */}
      <div
        className="pointer-events-auto absolute bottom-6 left-6 touch-none select-none"
        onPointerDown={(e) => {
          activeTouch.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          updateFromTouch(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activeTouch.current === e.pointerId) updateFromTouch(e.clientX, e.clientY);
        }}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        <div
          ref={baseRef}
          className="relative rounded-full bg-white/15 ring-2 ring-white/25 backdrop-blur-sm"
          style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}
        >
          <div
            className="absolute rounded-full bg-white/70"
            style={{
              width: STICK_RADIUS,
              height: STICK_RADIUS,
              left: STICK_RADIUS / 2 + knob.x,
              top: STICK_RADIUS / 2 + knob.y,
            }}
          />
        </div>
      </div>

      {/* Action buttons (right) */}
      <div className="pointer-events-auto absolute bottom-8 right-6 flex touch-none select-none flex-col items-end gap-3">
        <button
          className="h-20 w-20 rounded-full bg-red-500/80 text-lg font-black text-white ring-2 ring-white/30 active:scale-95"
          onPointerDown={(e) => {
            e.preventDefault();
            virtualInput.shootHeld = true;
          }}
          onPointerUp={() => (virtualInput.shootHeld = false)}
          onPointerCancel={() => (virtualInput.shootHeld = false)}
        >
          SHOOT
        </button>
        <button
          className="h-16 w-16 rounded-full bg-sky-500/80 text-base font-black text-white ring-2 ring-white/30 active:scale-95"
          onPointerDown={(e) => {
            e.preventDefault();
            virtualInput.passRequested = true;
          }}
        >
          PASS
        </button>
      </div>
    </>
  );
}
