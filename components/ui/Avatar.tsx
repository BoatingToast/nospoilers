'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback } from 'react'

// ── Size map ──────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 96,
  xl: 128,
}

// ── Default avatar SVG — cinematic clapperboard motif ─────────────────────────

function DefaultAvatar({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background */}
      <circle cx="50" cy="50" r="50" fill="#0C0C16" />
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke="#C8963E" strokeWidth="1" strokeOpacity="0.2" />

      {/* Clapperboard — rendered in a nested 24×24 viewport, centered at (22,24) 56px square */}
      <svg x="22" y="24" width="56" height="56" viewBox="0 0 24 24">
        {/* Clapper top bar */}
        <rect x="2" y="2" width="20" height="6" rx="1.5" fill="#C8963E" fillOpacity="0.45" />
        {/* Diagonal stripes on top bar */}
        <line x1="7"  y1="2" x2="4"  y2="8" stroke="#0C0C16" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="12" y1="2" x2="9"  y2="8" stroke="#0C0C16" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="17" y1="2" x2="14" y2="8" stroke="#0C0C16" strokeWidth="1.5" strokeOpacity="0.6" />
        {/* Horizontal divider */}
        <line x1="2" y1="8" x2="22" y2="8" stroke="#C8963E" strokeWidth="1" strokeOpacity="0.7" />
        {/* Body */}
        <rect x="2" y="8" width="20" height="14" rx="1.5"
          fill="#C8963E" fillOpacity="0.07"
          stroke="#C8963E" strokeWidth="1.2" strokeOpacity="0.5"
        />
        {/* Content lines */}
        <line x1="5" y1="13" x2="19" y2="13" stroke="#C8963E" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="5" y1="17" x2="14" y2="17" stroke="#C8963E" strokeWidth="0.8" strokeOpacity="0.3" />
      </svg>
    </svg>
  )
}

// ── Camera overlay (shown on hover when editable) ─────────────────────────────

function EditOverlay({ px }: { px: number }) {
  const iconSize = Math.max(12, Math.round(px * 0.3))
  return (
    <div className="absolute inset-0 rounded-full bg-black/55 flex flex-col items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
      {/* Camera icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      {px >= 64 && (
        <span className="text-white text-[9px] font-body mt-1 tracking-wide">Change</span>
      )}
    </div>
  )
}

// ── Main Avatar component ─────────────────────────────────────────────────────

export interface AvatarProps {
  /** The user's avatar image URL (from Supabase Storage). */
  src?:       string | null
  /** Username — used as alt text and for building the profile link. */
  username?:  string
  /** Size variant. */
  size?:      AvatarSize
  className?: string
  /**
   * If true, wrap avatar in a Link to /profile/{username}.
   * If a string, use that as the href.
   * If false/undefined, no link.
   */
  href?:      boolean | string
  /**
   * Show the "Change Picture" hover overlay.
   * When the user clicks it, onEditClick is called.
   */
  editable?:  boolean
  onEditClick?: () => void
  priority?:  boolean
}

export default function Avatar({
  src,
  username,
  size      = 'md',
  className = '',
  href,
  editable  = false,
  onEditClick,
  priority  = false,
}: AvatarProps) {
  const px  = SIZE_PX[size]
  const alt = username ? `${username}'s avatar` : 'User avatar'

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editable && onEditClick) {
        e.preventDefault()
        e.stopPropagation()
        onEditClick()
      }
    },
    [editable, onEditClick],
  )

  const inner = (
    <div
      className={`relative flex-shrink-0 rounded-full overflow-hidden ${editable ? 'group cursor-pointer' : ''} ${className}`}
      style={{ width: px, height: px }}
      onClick={editable ? handleClick : undefined}
      role={editable ? 'button' : undefined}
      aria-label={editable ? 'Change profile picture' : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          className="w-full h-full object-cover"
          sizes={`${px}px`}
          priority={priority}
        />
      ) : (
        <DefaultAvatar px={px} />
      )}

      {editable && <EditOverlay px={px} />}
    </div>
  )

  // Wrap in Link if href is requested
  if (href && !editable) {
    const linkHref = typeof href === 'string' ? href : username ? `/profile/${username}` : '#'
    return (
      <Link href={linkHref} aria-label={`View ${username}'s profile`}>
        {inner}
      </Link>
    )
  }

  return inner
}
