/**
 * NoSpoilers Icon Library
 * ───────────────────────
 * Original SVG icons — 2px rounded strokes, cinematic aesthetic.
 * All icons accept { size, className, strokeWidth } props.
 * Default colour: inherit `currentColor` from parent (set via Tailwind text-* or inline style).
 */

import React from 'react'

// ── Base ──────────────────────────────────────────────────────────────────────

export interface IconProps {
  size?:        number
  className?:   string
  strokeWidth?: number
}

function Svg({
  size = 20,
  className,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Movie DNA — film strip with double-helix inside the centre frame
// ─────────────────────────────────────────────────────────────────────────────
export function MovieDnaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Film strip border */}
      <rect x="7" y="2" width="10" height="20" rx="1.5" />
      {/* Top perforations */}
      <rect x="8.5" y="3.5"  width="1.5" height="2" rx="0.4" />
      <rect x="14"  y="3.5"  width="1.5" height="2" rx="0.4" />
      {/* Bottom perforations */}
      <rect x="8.5" y="18.5" width="1.5" height="2" rx="0.4" />
      <rect x="14"  y="18.5" width="1.5" height="2" rx="0.4" />
      {/* Frame dividers */}
      <line x1="7" y1="7"  x2="17" y2="7"  />
      <line x1="7" y1="17" x2="17" y2="17" />
      {/* DNA helix strands */}
      <path d="M9.5 9 Q12 11 9.5 13 Q12 15 9.5 16.5" />
      <path d="M14.5 9 Q12 11 14.5 13 Q12 15 14.5 16.5" />
      {/* Base pairs */}
      <line x1="9.5" y1="11" x2="14.5" y2="11" strokeWidth={(props.strokeWidth ?? 2) * 0.6} />
      <line x1="9.5" y1="13" x2="14.5" y2="13" strokeWidth={(props.strokeWidth ?? 2) * 0.6} />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Recommendations — four-pointed north-star compass (direction/discovery)
// ─────────────────────────────────────────────────────────────────────────────
export function RecsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* North star / 4-pointed compass */}
      <path d="M12 2 L13.4 10.6 L22 12 L13.4 13.4 L12 22 L10.6 13.4 L2 12 L10.6 10.6 Z" />
      {/* Centre jewel */}
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Ratings — cinema award medallion (circle + inner 4-pointed star + ribbon)
// ─────────────────────────────────────────────────────────────────────────────
export function RatingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Medallion ring */}
      <circle cx="12" cy="11" r="8" />
      {/* Inner 4-pointed star */}
      <path d="M12 5.5 L13 9.5 L17 10.5 L13 11.5 L12 15.5 L11 11.5 L7 10.5 L11 9.5 Z" />
      {/* Ribbon tails */}
      <path d="M9 19 L12 17 L15 19" />
      <path d="M10 19 L10 22" />
      <path d="M14 19 L14 22" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Achievements — trophy cup with laurel wings
// ─────────────────────────────────────────────────────────────────────────────
export function AchievementsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Cup body */}
      <path d="M8 4 H16 V11 C16 14 14 16 12 15.5 C10 16 8 14 8 11 Z" />
      {/* Stem + base */}
      <line x1="12" y1="15.5" x2="12" y2="19" />
      <rect x="8.5" y="19" width="7" height="1.5" rx="0.5" />
      {/* Handles */}
      <path d="M8 6 H6 C6 6 5 10 8 10" />
      <path d="M16 6 H18 C18 6 19 10 16 10" />
      {/* Laurel left */}
      <path d="M5 17 C4 15 3.5 13 5 11" />
      <path d="M5 17 C3.5 16.5 2.5 15 3 13" />
      {/* Laurel right */}
      <path d="M19 17 C20 15 20.5 13 19 11" />
      <path d="M19 17 C20.5 16.5 21.5 15 21 13" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Collections — three stacked film frames (perspective offset)
// ─────────────────────────────────────────────────────────────────────────────
export function CollectionsIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Back frame */}
      <rect x="9.5" y="3" width="11.5" height="14.5" rx="1.5" strokeOpacity="0.35" />
      {/* Mid frame */}
      <rect x="6"   y="5.5" width="11.5" height="14.5" rx="1.5" strokeOpacity="0.65" />
      {/* Front frame */}
      <rect x="2.5" y="8" width="11.5" height="14" rx="1.5" />
      {/* Film strip notch on front frame */}
      <line x1="2.5" y1="10.5" x2="14" y2="10.5" />
      <rect x="4"    y="8.75" width="1.4" height="1.75" rx="0.35" strokeWidth={sw * 0.65} />
      <rect x="10.6" y="8.75" width="1.4" height="1.75" rx="0.35" strokeWidth={sw * 0.65} />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Watchlist — film-strip bookmark with play triangle inside
// ─────────────────────────────────────────────────────────────────────────────
export function WatchlistIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Bookmark silhouette */}
      <path d="M6 2 H18 V22 L12 17 L6 22 Z" />
      {/* Film strip perforations at top */}
      <rect x="7.5"  y="3.5" width="1.75" height="2.5" rx="0.4" strokeWidth={sw * 0.65} />
      <rect x="14.75" y="3.5" width="1.75" height="2.5" rx="0.4" strokeWidth={sw * 0.65} />
      {/* Strip divider */}
      <line x1="6" y1="7" x2="18" y2="7" />
      {/* Play button */}
      <path d="M10 11 L15.5 14 L10 17 Z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Reviews — speech bubble with film-strip header
// ─────────────────────────────────────────────────────────────────────────────
export function ReviewsIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Bubble */}
      <path d="M3 5 C3 4.4 3.4 4 4 4 H20 C20.6 4 21 4.4 21 5 V15 C21 15.6 20.6 16 20 16 H8 L3 21 Z" />
      {/* Film strip line */}
      <line x1="3" y1="7.5" x2="21" y2="7.5" />
      {/* Perforations */}
      <rect x="4.5" y="4.75" width="1.5" height="2.25" rx="0.4" strokeWidth={sw * 0.65} />
      <rect x="18"  y="4.75" width="1.5" height="2.25" rx="0.4" strokeWidth={sw * 0.65} />
      {/* Text lines */}
      <line x1="6.5" y1="11" x2="17.5" y2="11" />
      <line x1="6.5" y1="14" x2="13.5" y2="14" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Friends — two overlapping silhouettes
// ─────────────────────────────────────────────────────────────────────────────
export function FriendsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Left person */}
      <circle cx="8.5" cy="7" r="3" />
      <path d="M2 21 C2 17.5 5 15 8.5 15" />
      {/* Right person */}
      <circle cx="15.5" cy="7" r="3" />
      <path d="M22 21 C22 17.5 19 15 15.5 15" />
      {/* Shared arc — connected */}
      <path d="M8.5 15 Q12 17.5 15.5 15" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Search — magnifying glass with film perforations on lens rim
// ─────────────────────────────────────────────────────────────────────────────
export function SearchIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Lens circle */}
      <circle cx="10.5" cy="10.5" r="7.5" />
      {/* Handle */}
      <line x1="16.5" y1="16.5" x2="21.5" y2="21.5" />
      {/* Film strip line across top of lens */}
      <line x1="3.5" y1="8.5" x2="17.5" y2="8.5" strokeWidth={sw * 0.6} />
      {/* Tiny perforations */}
      <rect x="5"   y="7" width="1.5" height="1.5" rx="0.3" strokeWidth={sw * 0.55} />
      <rect x="14.5" y="7" width="1.5" height="1.5" rx="0.3" strokeWidth={sw * 0.55} />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Top Five — podium with star on the #1 column
// ─────────────────────────────────────────────────────────────────────────────
export function TopFiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* #2 column */}
      <rect x="1.5" y="13" width="6.5" height="8.5" rx="0.75" />
      {/* #1 column (tallest) */}
      <rect x="8.75" y="8.5" width="6.5" height="13" rx="0.75" />
      {/* #3 column */}
      <rect x="16"   y="15.5" width="6.5" height="6" rx="0.75" />
      {/* Star above #1 */}
      <path
        d="M12 2 L13 5.2 L16.5 5.5 L14 7.5 L14.9 11 L12 9.2 L9.1 11 L10 7.5 L7.5 5.5 L11 5.2 Z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Trending — rising line chart with accent dots
// ─────────────────────────────────────────────────────────────────────────────
export function TrendingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Rising line */}
      <polyline points="2,18 8,12 13,15 22,4" />
      {/* Arrow */}
      <polyline points="16,4 22,4 22,10" />
      {/* Accent nodes */}
      <circle cx="8"  cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Popular — cinema projector emitting a beam
// ─────────────────────────────────────────────────────────────────────────────
export function PopularIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Projector body */}
      <rect x="1.5" y="8.5" width="11" height="7" rx="1.5" />
      {/* Lens circle */}
      <circle cx="12.5" cy="12" r="2.5" />
      {/* Projection beams */}
      <path d="M14.8 10.2 L22 5.5" />
      <path d="M14.8 13.8 L22 18.5" />
      {/* Film reel on projector top — two small circles */}
      <circle cx="4.5"  cy="8.5" r="2"   strokeWidth={sw * 0.7} />
      <circle cx="9"    cy="8.5" r="2"   strokeWidth={sw * 0.7} />
      <line   x1="4.5"  y1="8.5" x2="9" y2="8.5" strokeWidth={sw * 0.45} />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Spoiler-Free — shield with an open eye inside
// ─────────────────────────────────────────────────────────────────────────────
export function SpoilerFreeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Shield */}
      <path d="M12 2 L4 6 V12 C4 16.5 7.5 20.5 12 22 C16.5 20.5 20 16.5 20 12 V6 Z" />
      {/* Eye outline */}
      <path d="M8 12 C8 12 9.5 9.5 12 9.5 C14.5 9.5 16 12 16 12 C16 12 14.5 14.5 12 14.5 C9.5 14.5 8 12 8 12 Z" />
      {/* Pupil */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Dashboard — 2 × 2 grid of film frames
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Top-left */}
      <rect x="2"  y="2"  width="9" height="9" rx="1.5" />
      {/* Top-right */}
      <rect x="13" y="2"  width="9" height="9" rx="1.5" />
      {/* Bottom-left */}
      <rect x="2"  y="13" width="9" height="9" rx="1.5" />
      {/* Bottom-right */}
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
      {/* Film strip accent lines */}
      <line x1="2"  y1="5"  x2="11" y2="5"  strokeWidth={sw * 0.5} strokeOpacity="0.5" />
      <line x1="13" y1="5"  x2="22" y2="5"  strokeWidth={sw * 0.5} strokeOpacity="0.5" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Settings — film reel styled as a precision gear
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Outer gear ring */}
      <circle cx="12" cy="12" r="8.5" />
      {/* Centre sprocket hole */}
      <circle cx="12" cy="12" r="2.5" />
      {/* Three large reel perforations */}
      <circle cx="12"   cy="5.5"  r="1.25" strokeWidth={sw * 0.7} />
      <circle cx="18"   cy="15.5" r="1.25" strokeWidth={sw * 0.7} />
      <circle cx="6"    cy="15.5" r="1.25" strokeWidth={sw * 0.7} />
      {/* Gear teeth — 8 cardinal/diagonal spurs */}
      <line x1="12" y1="1.5" x2="12" y2="3.5"   />
      <line x1="12" y1="20.5" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="3.5" y2="12"   />
      <line x1="20.5" y1="12" x2="22.5" y2="12" />
      <line x1="4.4" y1="4.4" x2="5.8" y2="5.8"   />
      <line x1="18.2" y1="18.2" x2="19.6" y2="19.6" />
      <line x1="19.6" y1="4.4" x2="18.2" y2="5.8"   />
      <line x1="5.8" y1="18.2" x2="4.4" y2="19.6"   />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Notifications — bell with clapperboard-style diagonal stripes on crown
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Bell body */}
      <path d="M6 10 C6 6.7 8.7 4 12 4 C15.3 4 18 6.7 18 10 V16 H6 Z" />
      {/* Bell rim */}
      <line x1="4" y1="16" x2="20" y2="16" />
      {/* Clapper / clapper ball */}
      <path d="M10 16 V17.5 C10 18.6 10.9 19.5 12 19.5 C13.1 19.5 14 18.6 14 17.5 V16" />
      {/* Clapperboard crown stripes on bell top */}
      <path d="M9 4.5 L10.5 2.5" />
      <path d="M12 4 L12 2" />
      <path d="M15 4.5 L13.5 2.5" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Utility Icons (for emoji replacement throughout the app) ─────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Generic film frame (replaces 🎬 empty states)
export function FilmIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2"  y1="8"  x2="22" y2="8"  />
      <line x1="2"  y1="16" x2="22" y2="16" />
      <rect x="4"  y="4"  width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="9"  y="4"  width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="14" y="4"  width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="19" y="4"  width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="4"  y="18" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="9"  y="18" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="14" y="18" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
      <rect x="19" y="18" width="2" height="2" rx="0.3" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Triangle warning (replaces ⚠ spoiler warnings)
export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 3.4 L2 20 H22 L13.7 3.4 C13 2.2 11 2.2 10.3 3.4 Z" />
      <line x1="12" y1="9"  x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Sparkle / Wrapped (replaces ✨)
export function WrappedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Film reel outer ring */}
      <circle cx="12" cy="12" r="8.5" />
      {/* Reel centre hole */}
      <circle cx="12" cy="12" r="2.5" />
      {/* Three sprocket holes */}
      <circle cx="12"   cy="5.5"  r="1.25" />
      <circle cx="17.5" cy="15"   r="1.25" />
      <circle cx="6.5"  cy="15"   r="1.25" />
      {/* Sparkle points radiating out */}
      <line x1="12" y1="1"  x2="12" y2="2.5" />
      <line x1="12" y1="21.5" x2="12" y2="23" />
      <line x1="1"  y1="12" x2="2.5" y2="12" />
      <line x1="21.5" y1="12" x2="23" y2="12" />
      <line x1="3.5" y1="3.5" x2="4.6" y2="4.6"  />
      <line x1="19.4" y1="19.4" x2="20.5" y2="20.5" />
      <line x1="20.5" y1="3.5" x2="19.4" y2="4.6"  />
      <line x1="4.6" y1="19.4" x2="3.5" y2="20.5"  />
    </Svg>
  )
}

// Lock / Privacy (replaces 🔒)
export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11 V7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 V11" />
      <circle cx="12" cy="16" r="1.5" />
      <line x1="12" y1="17.5" x2="12" y2="19" />
    </Svg>
  )
}

// Simple star (replaces ⭐ in ratings display contexts)
export function StarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" />
    </Svg>
  )
}

// Profile / Person silhouette
export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20 C4 16.7 7.6 14 12 14 C16.4 14 20 16.7 20 20" />
    </Svg>
  )
}

// Eye (reveal spoiler)
export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12 C2 12 5 5 12 5 C19 5 22 12 22 12 C22 12 19 19 12 19 C5 19 2 12 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

// Eye-off (hidden / spoiler obscured)
export function EyeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17.9 17.9 C16.1 19.2 14.1 20 12 20 C5 20 2 12 2 12 C3.2 9.3 5 7.1 7.1 5.7" />
      <path d="M9.9 4.2 C10.6 4.1 11.3 4 12 4 C19 4 22 12 22 12 C21.5 13.3 20.8 14.6 19.9 15.7" />
      <path d="M14.1 14.1 C13.6 14.7 12.8 15 12 15 C10.3 15 9 13.7 9 12 C9 11.2 9.3 10.4 9.9 9.9" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </Svg>
  )
}

// Checkmark
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="20,6 9,17 4,12" />
    </Svg>
  )
}

// Plus / Add
export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="12" y1="5"  x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </Svg>
  )
}

// Close / X
export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </Svg>
  )
}

// Chevron (direction-aware)
export function ChevronIcon(props: IconProps & { direction?: 'up' | 'down' | 'left' | 'right' }) {
  const dir = props.direction ?? 'right'
  const pts: Record<string, string> = {
    right: '9,18 15,12 9,6',
    left:  '15,18 9,12 15,6',
    down:  '6,9 12,15 18,9',
    up:    '18,15 12,9 6,15',
  }
  return <Svg {...props}><polyline points={pts[dir]} /></Svg>
}

// Edit / Pencil
export function EditIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 4 H4 C3.4 4 3 4.4 3 5 V20 C3 20.6 3.4 21 4 21 H19 C19.6 21 20 20.6 20 20 V13" />
      <path d="M18.5 2.5 C19.3 1.7 20.6 1.7 21.4 2.5 C22.2 3.3 22.2 4.6 21.4 5.4 L12 15 L8 16 L9 12 Z" />
    </Svg>
  )
}

// Trash / Delete
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6 V20 C19 21 18 22 17 22 H7 C6 22 5 21 5 20 V6 M8 6 V4 C8 3 9 2 10 2 H14 C15 2 16 3 16 4 V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  )
}

// Arrow right (for CTAs)
export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </Svg>
  )
}

// Heart (for "love" / helpful)
export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.8 4.6 C18.4 2.2 14.6 2.2 12.2 4.6 L12 4.8 L11.8 4.6 C9.4 2.2 5.6 2.2 3.2 4.6 C0.8 7 0.8 10.8 3.2 13.2 L12 22 L20.8 13.2 C23.2 10.8 23.2 7 20.8 4.6 Z" />
    </Svg>
  )
}

// Thumbs-up
export function ThumbUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 22 H4 C3.4 22 3 21.6 3 21 V13 C3 12.4 3.4 12 4 12 H7" />
      <path d="M7 12 L10 2 C11.1 2 12 2.9 12 4 V8 H18 C19 8 19.9 8.7 19.9 9.7 L19 20 C18.9 21 18.1 22 17 22 H7 V12 Z" />
    </Svg>
  )
}

// Thumbs-down
export function ThumbDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 2 H20 C20.6 2 21 2.4 21 3 V11 C21 11.6 20.6 12 20 12 H17" />
      <path d="M17 12 L14 22 C12.9 22 12 21.1 12 20 V16 H6 C5 16 4.1 15.3 4.1 14.3 L5 3 C5.1 2 5.9 1 7 1 H17 V12 Z" />
    </Svg>
  )
}

// Clapperboard (movie pages / hero sections)
export function ClapperboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="9" width="20" height="13" rx="1.5" />
      <rect x="2" y="5" width="20" height="4"  rx="1" />
      <line x1="7"  y1="5"  x2="5"  y2="9" />
      <line x1="12" y1="5"  x2="10" y2="9" />
      <line x1="17" y1="5"  x2="15" y2="9" />
      <line x1="2"  y1="13" x2="22" y2="13" />
    </Svg>
  )
}

// Compass / discover (for genre/vibe-finding)
export function CompassIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Share
export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="18" cy="5"  r="3" />
      <circle cx="6"  cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6"  y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5"  x2="8.6"  y2="10.5" />
    </Svg>
  )
}

// Filter / sort
export function FilterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4"  y1="6"  x2="20" y2="6" />
      <line x1="7"  y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </Svg>
  )
}

// Calendar
export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DNA Dimension Icons (used in DnaPreview, MovieDNACard etc.)
// These are mini conceptual icons per dimension.
// ─────────────────────────────────────────────────────────────────────────────

// Suspense — lightning bolt
export function SuspenseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="13,2 7,13 12,13 11,22 17,11 12,11 13,2" />
    </Svg>
  )
}

// Emotion — film frame with a heart inside
export function EmotionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M16.5 7.5 C15.5 6.5 13.5 6.5 12 8 C10.5 6.5 8.5 6.5 7.5 7.5 C6.5 8.5 6.5 11 8.5 12.5 L12 16 L15.5 12.5 C17.5 11 17.5 8.5 16.5 7.5 Z"
            fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Complexity — layered film frames (depth/layers)
export function ComplexityIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2"  y="15" width="20" height="5" rx="1" />
      <rect x="4"  y="10" width="16" height="5" rx="1" />
      <rect x="6"  y="5"  width="12" height="5" rx="1" />
    </Svg>
  )
}

// Humor — film reel with a smile
export function HumorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 13 C9 16 15 16 16 13" />
      <circle cx="9"  cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Realism — a camera lens
export function RealismIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <circle cx="12" cy="14" r="1.75" />
      <path d="M7 7 V5 C7 4.4 7.4 4 8 4 H10 C10.6 4 11 4.4 11 5 V7" />
      <circle cx="18" cy="10" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Action — a fast arrow / double chevron
export function ActionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="5,12 12,5 19,12" />
      <polyline points="5,18 12,11 19,18" />
    </Svg>
  )
}

// Darkness — crescent moon
export function DarknessIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.8 A9 9 0 1 1 11.2 3 A7 7 0 0 0 21 12.8 Z" />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Spoiler Zone Icons ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// PulseIcon — Live tab: concentric broadcast rings expanding from a centre dot
export function PulseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Centre filled dot */}
      <circle cx="12" cy="12" r="2.75" fill="currentColor" stroke="none" />
      {/* Inner broadcast ring */}
      <circle cx="12" cy="12" r="6.5" strokeOpacity="0.55" />
      {/* Outer broadcast ring */}
      <circle cx="12" cy="12" r="10.5" strokeOpacity="0.22" />
    </Svg>
  )
}

// TimelineIcon — All Time tab: ascending bar chart of film frames on a baseline
export function TimelineIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Baseline */}
      <line x1="1" y1="20.5" x2="23" y2="20.5" strokeOpacity="0.35" />
      {/* Short left bar */}
      <rect x="2" y="15.5" width="5" height="5" rx="0.75" />
      {/* Medium centre bar */}
      <rect x="9.5" y="10" width="5" height="10.5" rx="0.75" />
      {/* Tallest right bar — film accent perforations */}
      <rect x="17" y="4.5" width="5" height="16" rx="0.75" />
      <rect x="18"   y="6"   width="1.2" height="2" rx="0.25" fill="currentColor" stroke="none" />
      <rect x="19.8" y="6"   width="1.2" height="2" rx="0.25" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// CalendarWeekIcon — This Week tab: calendar with film-strip header + week highlight
export function CalendarWeekIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Calendar body */}
      <rect x="2" y="4" width="20" height="18" rx="2" />
      {/* Header divider */}
      <line x1="2" y1="9.5" x2="22" y2="9.5" />
      {/* Binding pins */}
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      {/* Film strip perforations inside header */}
      <rect x="3.5" y="5.5" width="2"   height="3.5" rx="0.4" strokeWidth={sw * 0.6} />
      <rect x="18.5" y="5.5" width="2"  height="3.5" rx="0.4" strokeWidth={sw * 0.6} />
      {/* Week highlight band */}
      <line x1="4" y1="14.5" x2="20" y2="14.5" strokeOpacity="0.5" />
      <line x1="4" y1="18.5" x2="20" y2="18.5" strokeOpacity="0.5" />
      {/* Seven day dots (M–Su) */}
      <circle cx="5.5"  cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8.5"  cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="12.5" r="0.9" fill="currentColor" stroke="none" strokeOpacity="1" />
      <circle cx="14.5" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5.5"  cy="16.5" r="0.9" fill="currentColor" stroke="none" fillOpacity="0.35" />
      <circle cx="8.5"  cy="16.5" r="0.9" fill="currentColor" stroke="none" fillOpacity="0.35" />
    </Svg>
  )
}

// TodayIcon — Today tab: minimal calendar page with a bold circle marking today
export function TodayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Calendar page */}
      <rect x="3" y="4" width="18" height="18" rx="2" />
      {/* Header divider */}
      <line x1="3" y1="9" x2="21" y2="9" />
      {/* Binding pins */}
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      {/* Today circle — prominent, filled */}
      <circle cx="12" cy="15.5" r="3.75" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// TheoryIcon — Theories tab: film reel with three possibility branches radiating from hub
export function TheoryIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Outer reel ring */}
      <circle cx="12" cy="12" r="9.5" />
      {/* Centre hole */}
      <circle cx="12" cy="12" r="2.75" />
      {/* Three sprocket holes at 120° intervals */}
      <circle cx="12"    cy="4.5"  r="1.3" strokeWidth={sw * 0.7} />
      <circle cx="18.95" cy="16.25" r="1.3" strokeWidth={sw * 0.7} />
      <circle cx="5.05"  cy="16.25" r="1.3" strokeWidth={sw * 0.7} />
      {/* Theory branches: three lines from a hub inside the reel */}
      <circle cx="12" cy="10" r="1"  fill="currentColor" stroke="none" />
      <line x1="12"   y1="9"  x2="12"    y2="6"     strokeWidth={sw * 0.6} />
      <line x1="12"   y1="9"  x2="16.2"  y2="12.5"  strokeWidth={sw * 0.6} />
      <line x1="12"   y1="9"  x2="7.8"   y2="12.5"  strokeWidth={sw * 0.6} />
    </Svg>
  )
}

// SpoilerZoneIcon — Film-frame portal with an eye inside: entering spoiler territory
export function SpoilerZoneIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Film frame / portal border */}
      <rect x="2" y="4" width="20" height="16" rx="2" />
      {/* Film strip top rail */}
      <line x1="2" y1="7.5" x2="22" y2="7.5" />
      {/* Film perforations in top rail */}
      <rect x="3.5" y="4.75" width="1.5" height="2.5" rx="0.35" strokeWidth={sw * 0.6} />
      <rect x="19"  y="4.75" width="1.5" height="2.5" rx="0.35" strokeWidth={sw * 0.6} />
      {/* Eye inside the frame */}
      <path d="M5 13 C5 13 7.5 10.5 12 10.5 C16.5 10.5 19 13 19 13 C19 13 16.5 15.5 12 15.5 C7.5 15.5 5 13 5 13 Z" />
      {/* Pupil */}
      <circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// EmptyDiscussionIcon — Film reel + speech bubble: cinematic discussion awaiting
export function EmptyDiscussionIcon(props: IconProps) {
  const sw = props.strokeWidth ?? 2
  return (
    <Svg {...props}>
      {/* Film reel ring */}
      <circle cx="9.5" cy="13" r="7.5" />
      {/* Centre hole */}
      <circle cx="9.5" cy="13" r="2.5" />
      {/* Three sprocket holes at 120° */}
      <circle cx="9.5"   cy="6.5"  r="1.2" strokeWidth={sw * 0.7} />
      <circle cx="16"    cy="17"   r="1.2" strokeWidth={sw * 0.7} />
      <circle cx="3"     cy="17"   r="1.2" strokeWidth={sw * 0.7} />
      {/* Speech bubble */}
      <path d="M16.5 3 H22 C22.6 3 23 3.4 23 4 V8.5 C23 9.1 22.6 9.5 22 9.5 H18.5 L16.5 11.5 V9.5 C15.9 9.5 15.5 9.1 15.5 8.5 V4 C15.5 3.4 15.9 3 16.5 3 Z" />
      {/* Ellipsis dots inside bubble */}
      <circle cx="17.8" cy="6.75" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="20"   cy="6.75" r="0.85" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// PinIcon — Pinned messages: classic thumbtack (round head + crossbar + shaft)
export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Round head */}
      <circle cx="12" cy="5.5" r="3.5" />
      {/* Crossbar */}
      <line x1="7.5" y1="8.5" x2="16.5" y2="8.5" />
      {/* Shaft down to point */}
      <line x1="12" y1="8.5" x2="12" y2="21" />
    </Svg>
  )
}

// ── Achievement icon map ───────────────────────────────────────────────────────
// Maps achievement slugs → SVG icon component. Use getAchievementIcon(slug)
// in UI components instead of rendering the emoji stored in the data layer.

export function getAchievementIcon(slug: string): React.ComponentType<IconProps> {
  const MAP: Record<string, React.ComponentType<IconProps>> = {
    'first-watch':        FilmIcon,
    'five-films':         FilmIcon,
    'ten-films':          ClapperboardIcon,
    'fifty-films':        AchievementsIcon,
    'century-club':       AchievementsIcon,
    'watchlist-builder':  WatchlistIcon,
    'genre-explorer':     CompassIcon,
    'dna-decoded':        MovieDnaIcon,
    'personality-found':  WrappedIcon,
    'collector':          CollectionsIcon,
    'social-butterfly':   FriendsIcon,
    'trendsetter':        TrendingIcon,
  }
  return MAP[slug] ?? AchievementsIcon
}

// ── Personality icon map ───────────────────────────────────────────────────────
// Maps personality slugs → SVG icon component.

export function getPersonalityIcon(slug: string): React.ComponentType<IconProps> {
  const MAP: Record<string, React.ComponentType<IconProps>> = {
    'thinker':         ComplexityIcon,
    'thriller-seeker': SuspenseIcon,
    'explorer':        CompassIcon,
    'story-analyst':   EmotionIcon,
    'entertainer':     ClapperboardIcon,
    'auteur':          MovieDnaIcon,
    'escapist':        WrappedIcon,
  }
  return MAP[slug] ?? FilmIcon
}
