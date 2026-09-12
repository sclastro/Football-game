import { useEffect, useRef, useState } from "react";
import { virtualInput, resetVirtualInput } from "@/game/systems/virtualInput";
import { handleScreenTap } from "@/game/systems/selectionSystem";
import { Minimap } from "./Minimap";

const STICK_RADIUS = 70; // px — movement stick
const DEAD_ZONE = 0.14;
const EXPO = 1.35; // >1 = finer control near the centre
const SPRINT_AT = 0.92; // full extension sprints

const SHOOT_RADIUS = 58; // px — shoot/power circle
const ACTION_SIZE = 72; // px — slide / sprint
const FLICK_SIZE = 56; // px

/** A pointer that moved less than this, for less than this long, is a tap. */
const TAP_MAX_PX = 14;
const TAP_MAX_MS = 260;

interface StickState {
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
  mag: number; // 0..1 after processing
}

/**
 * Touch controls.
 *
 * - LEFT half: dynamic movement joystick — touch anywhere and the stick appears
 *   under your thumb. A quick TAP (rather than a drag) selects the player you
 *   tapped; tapping the same team-mate again passes to them and takes control.
 * - RIGHT: SHOOT (drag out for power), SLIDE, SPRINT and FLICK.
 *
 * There is no PASS button and no SWITCH button any more: passing is the
 * tap-tap gesture, and switching happens on its own the moment the opposition
 * plays a pass.
 */
export function TouchControls() {
  const [stick, setStick] = useState<StickState | null>(null);
  const pointerId = useRef<number | null>(null);
  const tapStart = useRef({ x: 0, y: 0, t: 0, moved: false });

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

  const beginTap = (x: number, y: number) => {
    tapStart.current = { x, y, t: performance.now(), moved: false };
  };

  const trackTap = (x: number, y: number) => {
    const s = tapStart.current;
    if (Math.hypot(x - s.x, y - s.y) > TAP_MAX_PX) s.moved = true;
  };

  /** Fire selection if the gesture was a tap rather than a drag. */
  const finishTap = (x: number, y: number) => {
    const s = tapStart.current;
    if (s.moved) return;
    if (performance.now() - s.t > TAP_MAX_MS) return;
    handleScreenTap(x, y);
  };

  const sprinting = stick ? stick.mag > 0 && virtualInput.sprint : false;

  return (
    <>
      {/* Left half: movement joystick + tap-to-select */}
      <div
        className="pointer-events-auto absolute inset-y-0 left-0 w-1/2 touch-none select-none"
        onPointerDown={(e) => {
          if (pointerId.current !== null) return;
          pointerId.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          beginTap(e.clientX, e.clientY);
          applyStick(e.clientX, e.clientY, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointerId.current !== e.pointerId || !stick) return;
          trackTap(e.clientX, e.clientY);
          applyStick(stick.baseX, stick.baseY, e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (pointerId.current !== e.pointerId) return;
          finishTap(e.clientX, e.clientY);
          endStick();
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
            <div
              className={`absolute inset-0 rounded-full backdrop-blur-sm transition-colors ${
                sprinting
                  ? "bg-yellow-300/20 ring-2 ring-yellow-300/70"
                  : "bg-white/10 ring-2 ring-white/30"
              }`}
            />
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
      </div>

      {/* Right half: tap-to-select (sits under the action controls) */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none select-none"
        onPointerDown={(e) => beginTap(e.clientX, e.clientY)}
        onPointerMove={(e) => trackTap(e.clientX, e.clientY)}
        onPointerUp={(e) => finishTap(e.clientX, e.clientY)}
      />

      {/* Minimap, bottom centre, out of the way of both thumbs. */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 p-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Minimap />
      </div>

      {/* Action controls */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 flex items-end gap-3 p-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col items-center gap-3">
          <ActionButton
            label="SLIDE"
            size={ACTION_SIZE}
            tone="bg-rose-600/85 ring-white/40"
            activeTone="bg-rose-400/90 ring-white/80"
            onPress={() => {
              virtualInput.slideRequested = true;
            }}
          />
          <ActionButton
            label="SPRINT"
            size={ACTION_SIZE}
            tone="bg-sky-600/85 ring-white/40"
            activeTone="bg-sky-400/90 ring-white/80"
            hold
            onPress={() => {
              virtualInput.sprint = true;
            }}
            onRelease={() => {
              virtualInput.sprint = false;
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-3">
          <ActionButton
            label="FLICK"
            size={FLICK_SIZE}
            tone="bg-violet-600/80 ring-white/40"
            activeTone="bg-violet-400/90 ring-white/80"
            onPress={() => {
              virtualInput.flickRequested = true;
            }}
          />
          <ShootCircle />
        </div>
      </div>
    </>
  );
}

interface ActionButtonProps {
  label: string;
  size: number;
  tone: string;
  activeTone: string;
  /** Sprint is held rather than tapped, so it needs a release callback. */
  hold?: boolean;
  onPress: () => void;
  onRelease?: () => void;
}

function ActionButton({
  label,
  size,
  tone,
  activeTone,
  onPress,
  onRelease,
}: ActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  const release = () => {
    if (!pressed) return;
    setPressed(false);
    onRelease?.();
  };
  return (
    <button
      className={`pointer-events-auto touch-none select-none rounded-full font-black text-white shadow-xl ring-2 backdrop-blur-sm transition ${
        pressed ? `scale-90 brightness-125 ${activeTone}` : tone
      }`}
      style={{ width: size, height: size, fontSize: size * 0.185 }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPressed(true);
        onPress();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {label}
    </button>
  );
}

/**
 * The shoot circle. Dragging out of it charges the strike; the distance you
 * drag is the distance the ball will travel, drawn as an arrow on the pitch in
 * front of your player. Direction is never taken from the drag — it is always
 * wherever the player is already facing.
 */
function ShootCircle() {
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
    virtualInput.shootHeld = true;
    virtualInput.shootAimX = dx;
    virtualInput.shootAimY = dy;
    virtualInput.shootPower = mag;
  };

  const end = (k: { dx: number; dy: number; mag: number } | null) => {
    virtualInput.firePower = k ? k.mag : 0;
    virtualInput.shootFired = true;
    virtualInput.shootHeld = false;
    virtualInput.shootAimX = 0;
    virtualInput.shootAimY = 0;
    virtualInput.shootPower = 0;
    setKnob(null);
    pid.current = null;
  };

  const power = knob ? knob.mag : 0;
  const shooting = power > 0.55; // hot once it's a real strike

  return (
    <div
      className="pointer-events-auto relative touch-none select-none rounded-full"
      style={{ width: SHOOT_RADIUS * 2, height: SHOOT_RADIUS * 2 }}
      onPointerDown={(e) => {
        e.stopPropagation();
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
      <div
        className={`absolute inset-0 rounded-full backdrop-blur-sm transition-colors ${
          shooting
            ? "bg-amber-400/45 ring-4 ring-amber-200/90"
            : power > 0
              ? "bg-orange-500/30 ring-2 ring-orange-300/80"
              : "bg-emerald-600/40 ring-2 ring-white/45"
        }`}
      />
      {/* Power arc around the rim: how far the ball is going to travel. */}
      {power > 0 && (
        <div
          className="pointer-events-none absolute inset-[-6px] rounded-full"
          style={{
            background: `conic-gradient(#fde047 ${power * 360}deg, transparent 0deg)`,
            mask: "radial-gradient(circle, transparent 61%, black 63%)",
            WebkitMask: "radial-gradient(circle, transparent 61%, black 63%)",
          }}
        />
      )}
      {knob ? (
        <div
          className="pointer-events-none absolute rounded-full bg-white/85 shadow-lg"
          style={{
            width: SHOOT_RADIUS * 0.7,
            height: SHOOT_RADIUS * 0.7,
            left: SHOOT_RADIUS * 0.65 + knob.dx,
            top: SHOOT_RADIUS * 0.65 + knob.dy,
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black tracking-wide text-white drop-shadow">
            SHOOT
          </span>
        </div>
      )}
    </div>
  );
}
