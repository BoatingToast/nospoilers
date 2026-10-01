'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image     from 'next/image'
import Avatar    from '@/components/ui/Avatar'
import Button    from '@/components/ui/Button'
import { SpoilerZoneIcon, TheoryIcon, PinIcon } from '@/components/icons'
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
      className="absolute left-full top-0 ml-3 w-72 bg-ns-surface
                 border border-ns-border rounded z-50"
      style={{ minHeight: '120px' }}
    >
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-ns-border animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 bg-ns-border rounded animate-pulse w-1/3" />
                <div className="h-2 bg-ns-border rounded animate-pulse w-full" />
                <div className="h-2 bg-ns-border rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !preview || preview.messages.length === 0 ? (
        <div className="p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
          <SpoilerZoneIcon size={24} className="text-ns-muted/30" />
          <p className="text-xs font-body text-ns-muted/50 text-center">No messages yet. Be the first!</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-body text-ns-muted/60 tracking-widest uppercase">
              Recent Discussion
            </span>
            {preview.onlineCount > 0 && (
              <span className="text-[11px] font-body text-emerald-400">
                {preview.onlineCount} online
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-2.5">
            {preview.messages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <Avatar src={msg.avatarUrl} username={msg.username} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-body font-semibold text-ns-text">
                      @{msg.username}
                    </span>
                    {msg.isTheory && (
                      <TheoryIcon size={9} className="text-violet-400/70" strokeWidth={2} />
                    )}
                    <span className="text-[11px] font-body text-ns-muted/40 ml-auto flex-shrink-0">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] font-body text-ns-muted/80 leading-snug line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Latest theory callout */}
          {preview.latestTheory && (
            <div className="border-t border-ns-border pt-2.5 mt-2">
              <div className="flex items-center gap-1.5 mb-1">
                <TheoryIcon size={10} className="text-violet-400" strokeWidth={2} />
                <span className="text-[11px] font-body text-violet-400 font-medium">Latest Theory</span>
              </div>
              <p className="text-[11px] font-body text-ns-muted/70 leading-snug line-clamp-2 italic">
                "{preview.latestTheory.content}"
              </p>
              <p className="text-[11px] font-body text-ns-muted/40 mt-0.5">
                by @{preview.latestTheory.username}
              </p>
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
    { key: 'open',      label: 'Open Discussion',     icon: '↗' },
    { key: 'mark_read', label: 'Mark All Read',        icon: '✓' },
    { key: membership.pinned ? 'unpin' : 'pin',
                        label: membership.pinned ? 'Unpin' : 'Pin to Top', icon: '📌' },
    { key: membership.notificationsEnabled ? 'mute' : 'unmute',
                        label: membership.notificationsEnabled ? 'Mute Notifications' : 'Unmute', icon: membership.notificationsEnabled ? '🔕' : '🔔' },
    { key: 'leave',     label: 'Leave Spoiler Zone',   icon: '✕', danger: true },
  ]

  return (
    <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="touch-action-reveal flex h-11 w-11 items-center justify-center rounded
                   bg-ns-bg/75 text-ns-text/80 hover:bg-ns-surface hover:text-ns-text
                   transition-[color,background-color,opacity]"
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
        <div className="absolute right-0 top-full mt-1 w-48 bg-ns-surface border border-ns-border
                        rounded z-50 py-1 overflow-hidden" role="menu">
          {items.map(item => (
            <button
              type="button"
              key={item.key}
              onClick={() => { setOpen(false); onAction(item.key) }}
              className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-body
                          transition-colors
                          ${'danger' in item && item.danger
                            ? 'text-red-400/80 hover:text-red-400 hover:bg-red-500/5'
                            : 'text-ns-muted hover:text-ns-text hover:bg-ns-surface/60'
                          }`}
              role="menuitem"
            >
              <span aria-hidden="true" className="w-4 text-center text-[11px]">{item.icon}</span>
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
      <div
        className={`relative overflow-hidden rounded border bg-ns-surface transition-colors duration-200
          ${m.pinned
            ? 'border-ns-secondary/30'
            : 'border-ns-border hover:border-ns-text/60'
          }`}
      >
        {/* Three-dot menu (top-right) */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <ThreeDotMenu
            membership={m}
            onAction={action => onAction(m.tmdbId, action)}
          />
        </div>

        {/* Unread badge */}
        {hasUnread && (
          <div className="absolute top-2.5 left-3 z-10">
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-ns-secondary px-1
                             text-[11px] font-bold tabular-nums text-ns-secondary-foreground">
              {m.unreadCount > 99 ? '99+' : m.unreadCount}
            </span>
          </div>
        )}

        {/* Poster */}
        <div className="relative h-36 overflow-hidden bg-ns-surface-2">
          {m.moviePoster ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${m.moviePoster}`}
              alt={m.movieTitle}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SpoilerZoneIcon size={36} className="text-ns-muted/20" />
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Title */}
          <h3 className="mb-2 line-clamp-2 font-body text-sm font-semibold leading-tight text-ns-text">
            {m.movieTitle}
          </h3>

          {/* Pinned / active state */}
          {(m.pinned || m.isActive) && (
            <p className="mb-2 flex flex-wrap items-center gap-x-2 font-body text-[11px] text-ns-secondary-readable">
              {m.pinned && (
                <span className="inline-flex items-center gap-1">
                  <PinIcon size={10} strokeWidth={2} /> Pinned
                </span>
              )}
              {m.isActive && <span className="font-medium">Active</span>}
            </p>
          )}

          {/* Stats row */}
          <p className="mb-1 flex flex-wrap gap-x-3 gap-y-1">
            <Stat value={fmt(m.memberCount)} label="Members" />
            <Stat value={fmt(m.messageCount)} label="Messages" />
          </p>

          {/* Last activity */}
          <p className="mb-3 font-body text-[11px] text-ns-muted">
            Last active {timeAgo(m.lastActivity)}
          </p>

          {/* CTA button */}
          <Button
            variant="outline"
            size="sm"
            href={`/movie/${m.tmdbId}`}
            className="min-h-11 w-full"
          >
            Open Spoiler Zone
          </Button>
        </div>
      </div>

      {/* Hover preview panel (positioned to the right) */}
      <HoverPreview tmdbId={m.tmdbId} visible={showPreview} />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-body text-xs font-semibold text-ns-text">{value}</span>
      <span className="font-body text-[11px] text-ns-muted">{label}</span>
    </span>
  )
}
