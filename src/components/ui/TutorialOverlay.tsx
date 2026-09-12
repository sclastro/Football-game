import { useGameStore } from "@/game/state/gameStore";
import { TUTORIAL_STEPS } from "@/game/data/tutorial";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

/**
 * The training-ground caption, top-left, exactly as asked: a heading, the
 * lesson, and the control it is teaching.
 *
 * Space moves on and Backspace goes back — the keys are bound by the tutorial
 * director — and the same two moves are on screen as buttons, because the
 * tutorial has to work on a phone too.
 */
export function TutorialOverlay() {
  const mode = useGameStore((s) => s.mode);
  const step = useGameStore((s) => s.tutorialStep);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const backToMenu = useGameStore((s) => s.backToMenu);

  if (mode !== "tutorial") return null;
  const lesson = TUTORIAL_STEPS[step];
  if (!lesson) return null;

  const last = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 font-sans text-white">
      <div className="absolute left-0 top-0 w-[min(92vw,380px)] p-3">
        <div className="rounded-2xl bg-neutral-950/88 p-4 ring-1 ring-white/12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
              Lesson {step + 1} / {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={backToMenu}
              className="pointer-events-auto rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold ring-1 ring-white/15 transition hover:bg-white/20"
            >
              Exit
            </button>
          </div>

          <h2 className="mt-1.5 text-xl font-black leading-tight">
            {lesson.title}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
            {lesson.body}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-400/15 px-3 py-1 text-[11px] font-bold text-yellow-200 ring-1 ring-yellow-300/40">
            {lesson.control}
          </div>

          {/* Progress pips */}
          <div className="mt-3 flex gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= step ? "bg-emerald-400" : "bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="pointer-events-auto mt-3 flex items-center gap-2">
            <button
              onClick={() => setTutorialStep(step - 1)}
              disabled={step === 0}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-30"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              Back
            </button>
            {last ? (
              <button
                onClick={backToMenu}
                className="flex flex-1 items-center justify-center gap-1 rounded-full bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-emerald-950 transition hover:bg-yellow-300"
              >
                Finish
              </button>
            ) : (
              <button
                onClick={() => setTutorialStep(step + 1)}
                className="flex flex-1 items-center justify-center gap-1 rounded-full bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-emerald-950 transition hover:bg-yellow-300"
              >
                Next
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/35">
            Space for the next lesson · Backspace to go back · shoot with J on a
            keyboard while you are in here
          </p>
        </div>
      </div>
    </div>
  );
}
