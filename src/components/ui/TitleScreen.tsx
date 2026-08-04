import { useGameStore } from "@/game/state/gameStore";
import { audio } from "@/game/systems/audio";

/**
 * Layer 1 of the menu: the game's name over a moving stadium-night backdrop.
 * The only action is START, which advances to nation selection.
 */
export function TitleScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-950 font-sans text-white">
      <style>{`
        @keyframes pp-drift { 0%,100% { transform: translate3d(-6%,0,0) scale(1.15) } 50% { transform: translate3d(6%,-3%,0) scale(1.25) } }
        @keyframes pp-sweep { 0% { transform: translateX(-120%) skewX(-18deg) } 100% { transform: translateX(320%) skewX(-18deg) } }
        @keyframes pp-spin  { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        @keyframes pp-rise  { 0% { opacity: 0; transform: translateY(18px) } 100% { opacity: 1; transform: translateY(0) } }
        @keyframes pp-glow  { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
      `}</style>

      {/* Drifting pitch-green aurora */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 30% 40%, #0f7a3d 0%, transparent 60%), radial-gradient(55% 50% at 75% 65%, #0b4f8a 0%, transparent 62%)",
          animation: "pp-drift 18s ease-in-out infinite",
        }}
      />
      {/* Floodlight sweep */}
      <div
        className="pointer-events-none absolute inset-y-0 w-1/4 bg-white/8 blur-2xl"
        style={{ animation: "pp-sweep 9s linear infinite" }}
      />
      {/* Faint pitch stripes along the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(90deg, #ffffff10 0 26px, transparent 26px 52px)",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      {/* Slowly spinning ball motif */}
      <div
        className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff 0 12%, #999 12% 20%, #fff 20% 34%, #666 34% 40%, #fff 40%)",
          animation: "pp-spin 40s linear infinite",
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div style={{ animation: "pp-rise .7s ease-out both" }}>
          <div className="text-xs font-semibold uppercase tracking-[0.45em] text-emerald-300/80">
            World Football
          </div>
          <h1 className="mt-2 bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:text-7xl">
            PIXEL PITCH
          </h1>
          <div
            className="mx-auto mt-3 h-1 w-40 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent"
            style={{ animation: "pp-glow 2.6s ease-in-out infinite" }}
          />
          <p className="mt-4 text-sm text-white/60">
            Pick your nation. Build your XI. Win the cup.
          </p>
        </div>

        <button
          onClick={() => {
            audio.resume(); // unlock the audio context from this user gesture
            setScreen("teamSelect");
          }}
          className="mt-12 rounded-full bg-yellow-400 px-14 py-4 text-xl font-black text-emerald-950 shadow-[0_10px_30px_-8px_rgba(250,204,21,0.7)] transition hover:bg-yellow-300 active:scale-95"
          style={{ animation: "pp-rise .7s ease-out .2s both" }}
        >
          START ▶
        </button>
      </div>
    </div>
  );
}
