'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image     from 'next/image'
import Avatar    from '@/components/ui/Avatar'
import Button    from '@/components/ui/Button'
import { ArrowRightIcon, CheckIcon, CloseIcon, NotificationsIcon, PinIcon, SpoilerZoneIcon, TheoryIcon } from '@/components/icons'
import type { SZMembership, SZPreview } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return 'No activity yet'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ── Hover preview panel ───────────────────────────────────────────────────────

function HoverPreview({ tmdbId, visible }: { tmdbId: number; visible: boolean }) {
  const [preview, setPreview] = useState<SZPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (!visible || fetched.current) return
    fetched.current = true
    setLoading(true)
    fetch(`/api/spoiler-zone/${tmdbId}/preview`)
      .then(r => r.ok ? r.json() : null)
      .then((d: SZPreview | null) => setPreview(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [visible, tmdbId])

  if (!visible) return null

  return (
    <div
      className="absolute inset-x-0 top-full z-40 mt-2 min-h-28 rounded-2xl bg-ns-surface-2 shadow-2xl motion-safe:animate-[fadeUp_180ms_cubic-bezier(0.23,1,0.32,1)_backwards]"
    >
      {loading ? (
        <div aria-hidden="true" className="space-y-3 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex animate-pulse gap-2">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-ns-surface-3" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded bg-ns-surface-3" />
                <div className="h-3 w-full rounded bg-ns-surface-3" />
              </div>
            </div>
          ))}
        </div>
      ) : !preview || preview.messages.length === 0 ? (
        <p className="flex min-h-28 items-center justify-center p-4 text-center text-sm text-ns-muted">
          No messages yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ns-text">Recent Discussion</span>
            {preview.onlineCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs tabular-nums text-ns-success">
                <span className="h-1.5 w-1.5 rounded-full bg-ns-success" />
                {preview.onlineCount} online
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {preview.messages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <Avatar src={msg.avatarUrl} username={msg.username} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-ns-text">@{msg.username}</span>
                    {msg.isTheory && <TheoryIcon size={12} className="flex-shrink-0 text-ns-muted" strokeWidth={2} />}
                    <span className="ml-auto flex-shrink-0 text-xs text-ns-muted">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-snug text-ns-muted">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {preview.latestTheory && (
            <div className="border-t border-ns-border pt-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ns-text">
                <TheoryIcon size={12} strokeWidth={2} /> Latest Theory
              </p>
              <p className="line-clamp-2 text-xs italic leading-snug text-ns-muted">
                &ldquo;{preview.latestTheory.content}&rdquo;
              </p>
              <p className="mt-0.5 text-xs text-ns-muted">by @{preview.latestTheory.username}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Three-dot menu ────────────────────────────────────────────────────────────

interface MenuProps {
  membership: SZMembership
  onAction:   (action: string) => void
}

function ThreeDotMenu({ membership, onAction }: MenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const items = [
    { key: 'open', label: 'Open Discussion', Icon: ArrowRightIcon },
    { key: 'mark_read', label: 'Mark All Read', Icon: CheckIcon },
    { key: membership.pinned ? 'unpin' : 'pin',
                        label: membership.pinned ? 'Unpin' : 'Pin to Top', Icon: PinIcon },
    { key: membership.notificationsEnabled ? 'mute' : 'unmute',
                        label: membership.notificationsEnabled ? 'Mute Notifications' : 'Unmute', Icon: NotificationsIcon },
    { key: 'leave', label: 'Leave Spoiler Zone', Icon: CloseIcon, danger: true },
  ]

  return (
    <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="touch-action-reveal flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white transition-[color,background-color,opacity] duration-150 hover:bg-black/90"
        aria-label={`Actions for ${membership.movieTitle}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5"  cy="12" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="19" cy="12" r="2"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-2xl bg-ns-surface-2 p-1.5 shadow-2xl motion-safe:animate-[fadeUp_160ms_cubic-bezier(0.23,1,0.32,1)_backwards]"
        >
          {items.map(item => (
            <button
              type="button"
              key={item.key}
              onClick={() => { setOpen(false); onAction(item.key) }}
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150 ${
                'danger' in item && item.danger
                  ? 'text-ns-danger hover:bg-ns-danger/10'
                  : 'text-ns-text hover:bg-ns-surface-3'
              }`}
              role="menuitem"
            >
              <item.Icon size={15} className="flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Card ─────────────────────────────────────────────────────────────────

interface Props {
  membership:  SZMembership
  onAction:    (tmdbId: number, action: string) => void
}

export default function SpoilerZoneCard({ membership: m, onAction }: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    hoverTimer.current = setTimeout(() => setShowPreview(true), 400)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setShowPreview(false)
  }, [])

  const hasUnread = m.unreadCount > 0

  return (
    <div
      className="group touch-action-group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex h-full flex-col rounded-2xl bg-ns-surface">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-ns-surface-2">
          {m.moviePoster ? (
            <>
              <Image
                src={`https://image.tmdb.org/t/p/w342${m.moviePoster}`}
                alt=""
                fill
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SpoilerZoneIcon size={32} className="text-ns-muted" />
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
            {m.pinned && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-black/80 px-2 text-xs font-semibold text-white">
                <PinIcon size={12} strokeWidth={2} /> Pinned
              </span>
            )}
            {m.isActive && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-black/80 px-2 text-xs font-semibold text-white">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-ns-accent" />
                </span>
                Active
              </span>
            )}
          </div>

          {hasUnread && (
            <span
              key={m.unreadCount}
              className="absolute left-3 top-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ns-accent px-2 text-xs font-bold tabular-nums text-ns-secondary-foreground motion-safe:animate-fade-up"
            >
              {m.unreadCount > 99 ? '99+' : m.unreadCount}
            </span>
          )}
        </div>

        {/* The menu sits outside the clipped poster so it can open over the card. */}
        <div className="absolute right-2 top-2 z-10">
          <ThreeDotMenu
            membership={m}
            onAction={action => onAction(m.tmdbId, action)}
          />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 font-heading text-lg font-bold leading-tight text-ns-text">
            {m.movieTitle}
          </h3>
          <p className="mt-1.5 text-sm tabular-nums text-ns-muted">
            {fmt(m.memberCount)} Members · {fmt(m.messageCount)} Messages
          </p>
          <p className="mb-4 mt-0.5 text-sm text-ns-muted">
            Last active {timeAgo(m.lastActivity)}
          </p>

          <Button
            href={`/movie/${m.tmdbId}`}
            variant="secondary"
            className="mt-auto w-full bg-ns-surface-2 hover:bg-ns-surface-3"
          >
            Open Spoiler Zone
          </Button>
        </div>
      </div>

      <HoverPreview tmdbId={m.tmdbId} visible={showPreview} />
    </div>
  )
}
