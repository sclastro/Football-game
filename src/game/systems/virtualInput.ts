/**
 * Shared mutable state written by the on-screen touch controls and merged into
 * the keyboard input each frame. Screen-space: moveX right = +X, moveY up = -Z
 * (matches "forward = up the pitch").
 */
export const virtualInput = {
  active: false,
  moveX: 0,
  moveY: 0,
  sprint: false,
  shootHeld: false,
  /** One-shot: set true on a pass tap, consumed by the input system. */
  passRequested: false,
};

export function resetVirtualInput() {
  virtualInput.moveX = 0;
  virtualInput.moveY = 0;
  virtualInput.sprint = false;
  virtualInput.shootHeld = false;
  virtualInput.passRequested = false;
}
