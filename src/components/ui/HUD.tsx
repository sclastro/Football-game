export function HUD() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 font-sans text-white">
      <div className="rounded-md bg-black/50 px-4 py-2 text-center text-sm">
        Move: WASD / Arrows (A/D along the pitch) &middot; Shift sprint &middot; E pass &middot; hold Space to shoot &middot; you always control whoever is on the ball
      </div>
    </div>
  );
}
