/**
 * Shared mutable state written by the on-screen touch controls and merged into
 * the keyboard input each frame. Screen-space: moveX right = +X, moveY up = -Z
 * (matches "forward = up the pitch").
 */
export const virtualInput = {
  active: false,
  // Left movement joystick.
  moveX: 0,
  moveY: 0,
  sprint: false,
  // Right SHOOT stick: drag to aim, release to kick. A gentle drag is a short
  // pass, a big drag is a shot — one control does both.
  shootHeld: false,
  /** Live screen-space aim while dragging (right/down positive), for the UI. */
  shootAimX: 0,
  shootAimY: 0,
  /** Live 0..1 drag length while aiming, used to draw the in-world preview. */
  shootPower: 0,
  /** One-shot: the shoot stick was released this frame. */
  shootFired: false,
  /** Power 0..1 from the drag distance at release. */
  firePower: 0,
  /** Normalized screen-space aim direction captured at release. */
  fireAimX: 0,
  fireAimY: 0,
  /** Legacy keyboard-pass flag (unused by touch; kept for the input merge). */
  passRequested: false,
};

export function resetVirtualInput() {
  virtualInput.moveX = 0;
  virtualInput.moveY = 0;
  virtualInput.sprint = false;
  virtualInput.shootHeld = false;
  virtualInput.shootAimX = 0;
  virtualInput.shootAimY = 0;
  virtualInput.shootPower = 0;
  virtualInput.shootFired = false;
  virtualInput.firePower = 0;
  virtualInput.fireAimX = 0;
  virtualInput.fireAimY = 0;
  virtualInput.passRequested = false;
}
