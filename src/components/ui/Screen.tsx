import type { ReactNode } from "react";
import { MenuBackground } from "./MenuBackground";

/**
 * Shared shell for every menu layer.
 *
 * The scroll behaviour here is the fix for content being unreachable on a
 * laptop. The outer box is the scroller; the inner box is `min-h-full` so it
 * grows past the viewport when the content needs it. Content is centred with
 * `my-auto` rather than `justify-center` — `justify-center` inside a fixed-height
 * box pushes overflow off BOTH edges, where `my-auto` centres only when there is
 * spare room and otherwise lets the page scroll normally.
 */
export function Screen({
  tint,
  children,
  /** Rendered outside the scroll area, pinned to the bottom (e.g. a CTA bar). */
  footer,
}: {
  tint?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex flex-col font-sans text-white">
      <MenuBackground tint={tint} />
      <div className="pp-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-6">
          <div className="my-auto w-full">{children}</div>
        </div>
      </div>
      {footer && (
        <div className="relative border-t border-white/10 bg-black/40 backdrop-blur-md">
          <div className="mx-auto w-full max-w-3xl px-5 py-3">{footer}</div>
        </div>
      )}
    </div>
  );
}

/** Section heading in the shared menu style. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/80">
      {children}
    </h2>
  );
}

/** The gradient-clipped headline used across the menu layers. */
export function Headline({ children }: { children: ReactNode }) {
  return (
    <h1 className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-center text-3xl font-black tracking-tight text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] sm:text-4xl">
      {children}
    </h1>
  );
}

/** Rounded selector pill, shared by match length / difficulty / controls. */
export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${
        active
          ? "bg-yellow-400 text-emerald-950 shadow-[0_6px_20px_-6px_rgba(250,204,21,0.8)]"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

/** Small back button used at the top of the inner layers. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 self-start rounded-full bg-white/10 py-1.5 pl-2.5 pr-4 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Back
    </button>
  );
}
