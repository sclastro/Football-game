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
  /**
   * Right SHOOT circle. Dragging it sets POWER ONLY — the further you pull, the
   * further the ball travels, and the on-pitch arrow shows exactly how far. The
   * direction is always the way your player is facing, so a drag to the right
   * while running left still strikes the ball to the left.
   */
  shootHeld: false,
  /** Live screen-space drag offset while aiming, for drawing the stick. */
  shootAimX: 0,
  shootAimY: 0,
  /** Live 0..1 drag length while aiming, used to draw the in-world preview. */
  shootPower: 0,
  /** One-shot: the shoot circle was released this frame. */
  shootFired: false,
  /** Power 0..1 from the drag distance at release. */
  firePower: 0,
  /** One-shot taps from the other circles and the keyboard. */
  passRequested: false,
  flickRequested: false,
  slideRequested: false,
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
  virtualInput.passRequested = false;
  virtualInput.flickRequested = false;
  virtualInput.slideRequested = false;
}
