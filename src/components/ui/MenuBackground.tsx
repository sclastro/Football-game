/**
 * The shared menu backdrop: a drifting aurora, a floodlight sweep, faint pitch
 * stripes and a slowly spinning ball motif.
 *
 * `tint` is the selected nation's kit colour, so stepping into Portugal really
 * does turn the screen red. It is blended over a constant emerald/blue base
 * rather than replacing it, which keeps every nation looking like the same game.
 */
export function MenuBackground({ tint }: { tint?: string }) {
  const accent = tint ?? "#0f7a3d";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base wash — always present, so the palette never drifts off-brand. */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-emerald-950 to-neutral-950" />

      {/* Drifting aurora, tinted to the nation */}
      <div
        className="absolute inset-0 opacity-70 transition-[background] duration-700"
        style={{
          background: `radial-gradient(60% 55% at 28% 38%, ${accent} 0%, transparent 62%), radial-gradient(55% 50% at 76% 68%, #0b4f8a 0%, transparent 64%)`,
          animation: "pp-drift 18s ease-in-out infinite",
        }}
      />

      {/* Floodlight sweep */}
      <div
        className="absolute inset-y-0 w-1/4 bg-white/[0.07] blur-2xl"
        style={{ animation: "pp-sweep 11s linear infinite" }}
      />

      {/* Faint pitch stripes fading up from the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(90deg, #ffffff10 0 26px, transparent 26px 52px)",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      {/* Spinning ball motif, tucked into the corner */}
      <div
        className="absolute -right-16 top-8 h-64 w-64 rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff 0 12%, #999 12% 20%, #fff 20% 34%, #666 34% 40%, #fff 40%)",
          animation: "pp-spin 40s linear infinite",
        }}
      />

      {/* Vignette, so the content always has something to sit against */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
