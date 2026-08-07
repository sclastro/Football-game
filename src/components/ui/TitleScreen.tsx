import { useGameStore } from "@/game/state/gameStore";
import { audio } from "@/game/systems/audio";
import { MenuBackground } from "./MenuBackground";
import { PlayIcon } from "./Icons";

/**
 * Layer 1 of the menu: the game's name over a moving stadium-night backdrop.
 * The only action is START, which advances to nation selection.
 *
 * Note this is a scroll container like the other layers rather than a fixed
 * centred box — on a short laptop the old version pushed the headline and the
 * button off both edges at once, with no way to reach them.
 */
export function TitleScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="absolute inset-0 font-sans text-white">
      <MenuBackground />
      <div className="pp-scroll relative h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-6 py-10">
          <div className="my-auto text-center">
            <div className="pp-rise">
              <div className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-300/80">
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
              className="pp-rise mt-12 inline-flex items-center gap-3 rounded-full bg-yellow-400 px-14 py-4 text-xl font-black text-emerald-950 shadow-[0_10px_30px_-8px_rgba(250,204,21,0.7)] transition hover:bg-yellow-300 active:scale-95"
              style={{ animationDelay: "0.15s" }}
            >
              START
              <PlayIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
