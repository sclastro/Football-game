/**
 * Inline SVG icons.
 *
 * These replace the emoji the UI used to lean on (⚙ 🔊 🔈 ⏱ ⚡ ◀ ▲ ▶). Emoji
 * render inconsistently across platforms — sizes jump, some are monochrome on
 * one OS and colour on another, and a missing glyph shows a tofu box. Drawn
 * icons inherit `currentColor` and are identical everywhere.
 */

interface IconProps {
  className?: string;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GearIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" {...stroke} />
      <path
        d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H2.9a2 2 0 110-4H3a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V2.9a2 2 0 114 0V3a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.2a2 2 0 110 4H21a1.7 1.7 0 00-1.5 1z"
        {...stroke}
      />
    </svg>
  );
}

export function SoundOnIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" {...stroke} />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" {...stroke} />
    </svg>
  );
}

export function SoundOffIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M11 5L6 9H2v6h4l5 4V5z" {...stroke} />
      <path d="M22 9l-6 6M16 9l6 6" {...stroke} />
    </svg>
  );
}

export function ClockIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M12 7v5l3 2" {...stroke} />
    </svg>
  );
}

export function BoltIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M7 4l13 8-13 8V4z" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 12.5l5.5 5.5L20 7" {...stroke} strokeWidth={3} />
    </svg>
  );
}

/** Penalty direction arrows: left, straight up (centre) and right. */
export function ArrowLeftIcon({ className = "h-7 w-7" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M15 4L7 12l8 8" {...stroke} strokeWidth={3} />
    </svg>
  );
}

export function ArrowUpIcon({ className = "h-7 w-7" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 15l8-8 8 8" {...stroke} strokeWidth={3} />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-7 w-7" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M9 4l8 8-8 8" {...stroke} strokeWidth={3} />
    </svg>
  );
}

/** A star rating chip used on the nation cards. */
export function StarIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z"
        fill="currentColor"
      />
    </svg>
  );
}
