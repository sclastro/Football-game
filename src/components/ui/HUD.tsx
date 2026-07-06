export function HUD() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 font-sans text-white">
      <div className="rounded-md bg-black/50 px-4 py-2 text-center text-sm">
        WASD / Arrows to move &middot; Hold Shift to sprint &middot; Hold Space to charge &amp; release to shoot
      </div>
    </div>
  );
}
