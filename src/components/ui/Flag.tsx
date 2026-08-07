import type { ReactNode } from "react";

/**
 * Drawn national flags.
 *
 * Flag emoji are unusable here: Windows ships Segoe UI Emoji, which deliberately
 * contains no regional-indicator glyphs, so 🇧🇷 renders as the letters "BR" in
 * boxes — and England's flag is a 7-codepoint tag sequence that fails on even
 * more platforms. No font fixes that, so the flags are drawn instead.
 *
 * These are simplified to the shapes that make each flag recognisable at 24px:
 * bands, crosses, discs, one diamond and one star. Anything finer than that is
 * invisible at the sizes we actually render.
 */

const VB = "0 0 60 40";

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      {/* Subtle border so pale flags still read against a light card. */}
      <rect
        x="0.5"
        y="0.5"
        width="59"
        height="39"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
        rx="2"
      />
    </>
  );
}

/** Three vertical bands. */
function Vertical(a: string, b: string, c: string) {
  return (
    <Frame>
      <rect width="20" height="40" fill={a} />
      <rect x="20" width="20" height="40" fill={b} />
      <rect x="40" width="20" height="40" fill={c} />
    </Frame>
  );
}

/** Three horizontal bands. */
function Horizontal(a: string, b: string, c: string) {
  return (
    <Frame>
      <rect width="60" height="13.34" fill={a} />
      <rect y="13.34" width="60" height="13.33" fill={b} />
      <rect y="26.67" width="60" height="13.33" fill={c} />
    </Frame>
  );
}

const FLAGS: Record<string, ReactNode> = {
  BRA: (
    <Frame>
      <rect width="60" height="40" fill="#009b3a" />
      <polygon points="30,5 55,20 30,35 5,20" fill="#fedf00" />
      <circle cx="30" cy="20" r="8" fill="#002776" />
      <path d="M22 18c6 4 12 4 16 1" stroke="#fff" strokeWidth="1.6" fill="none" />
    </Frame>
  ),
  ARG: (
    <Frame>
      <rect width="60" height="40" fill="#74acdf" />
      <rect y="13.34" width="60" height="13.33" fill="#fff" />
      <circle cx="30" cy="20" r="4.2" fill="#f6b40e" />
    </Frame>
  ),
  FRA: Vertical("#002395", "#ffffff", "#ed2939"),
  ENG: (
    <Frame>
      <rect width="60" height="40" fill="#fff" />
      <rect x="24" width="12" height="40" fill="#ce1124" />
      <rect y="14" width="60" height="12" fill="#ce1124" />
    </Frame>
  ),
  GER: Horizontal("#000000", "#dd0000", "#ffce00"),
  ESP: (
    <Frame>
      <rect width="60" height="40" fill="#c60b1e" />
      <rect y="10" width="60" height="20" fill="#ffc400" />
    </Frame>
  ),
  POR: (
    <Frame>
      <rect width="60" height="40" fill="#f00" />
      <rect width="24" height="40" fill="#046a38" />
      <circle cx="24" cy="20" r="7" fill="#ffe900" stroke="#046a38" strokeWidth="1.4" />
      <rect x="20.5" y="16.5" width="7" height="7" fill="#fff" stroke="#c00" strokeWidth="1.2" />
    </Frame>
  ),
  NED: Horizontal("#ae1c28", "#ffffff", "#21468b"),
  JPN: (
    <Frame>
      <rect width="60" height="40" fill="#fff" />
      <circle cx="30" cy="20" r="10" fill="#bc002d" />
    </Frame>
  ),
  CRO: (
    <Frame>
      <rect width="60" height="40" fill="#171796" />
      <rect width="60" height="13.34" fill="#ff0000" />
      <rect y="13.34" width="60" height="13.33" fill="#fff" />
      {/* Simplified chequy shield */}
      <g>
        <rect x="24" y="11" width="12" height="12" fill="#fff" stroke="#ff0000" strokeWidth="1" />
        <rect x="24" y="11" width="6" height="6" fill="#ff0000" />
        <rect x="30" y="17" width="6" height="6" fill="#ff0000" />
      </g>
    </Frame>
  ),
  MEX: (
    <Frame>
      <rect width="20" height="40" fill="#006847" />
      <rect x="20" width="20" height="40" fill="#fff" />
      <rect x="40" width="20" height="40" fill="#ce1126" />
      <circle cx="30" cy="20" r="5" fill="none" stroke="#8b5a2b" strokeWidth="2" />
    </Frame>
  ),
  MAR: (
    <Frame>
      <rect width="60" height="40" fill="#c1272d" />
      <path
        d="M30 11.5l2.6 8.1h8.5l-6.9 5 2.6 8.1-6.8-5-6.8 5 2.6-8.1-6.9-5h8.5z"
        fill="none"
        stroke="#006233"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Frame>
  ),
};

/**
 * A nation's flag at a given pixel width. `id` is the team id; an unknown id
 * falls back to a neutral placeholder rather than disappearing.
 */
export function Flag({
  id,
  width = 28,
  className = "",
}: {
  id: string;
  width?: number;
  className?: string;
}) {
  const art = FLAGS[id];
  return (
    <svg
      viewBox={VB}
      width={width}
      height={(width * 2) / 3}
      className={`shrink-0 rounded-[2px] shadow-sm ${className}`}
      role="img"
      aria-label={id}
    >
      {art ?? (
        <Frame>
          <rect width="60" height="40" fill="#4b5563" />
        </Frame>
      )}
    </svg>
  );
}
