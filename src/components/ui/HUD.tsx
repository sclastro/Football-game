import { useRef } from "react";
import { handleScreenTap } from "@/game/systems/selectionSystem";

/** A pointer that moved less than this, for less than this long, is a click. */
const TAP_MAX_PX = 10;
const TAP_MAX_MS = 300;

/**
 * Keyboard/desktop HUD. The transparent layer underneath catches clicks on
 * players so mouse users get the same select / take-over behaviour as touch.
 */
export function HUD() {
  const start = useRef({ x: 0, y: 0, t: 0, moved: false });

  return (
    <>
      <div
        className="pointer-events-auto absolute inset-0"
        onPointerDown={(e) => {
          start.current = {
            x: e.clientX,
            y: e.clientY,
            t: performance.now(),
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_MAX_PX) {
            s.moved = true;
          }
        }}
        onPointerUp={(e) => {
          const s = start.current;
          if (s.moved || performance.now() - s.t > TAP_MAX_MS) return;
          handleScreenTap(e.clientX, e.clientY);
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 font-sans text-white">
        <div className="max-w-2xl rounded-md bg-black/50 px-4 py-2 text-center text-sm">
          WASD move &middot; Shift sprint &middot; <b>click a team-mate</b> to
          select, click again to take over &middot; E pass &middot; hold Space to
          shoot
        </div>
      </div>
    </>
  );
}
