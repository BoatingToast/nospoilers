'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link      from 'next/link'
import Image     from 'next/image'
import Avatar    from '@/components/ui/Avatar'
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
      className="absolute left-full top-0 ml-3 w-72 bg-ns-surface/95 backdrop-blur-md
                 border border-ns-border rounded-2xl shadow-2xl shadow-black/50 z-50"
      style={{ minHeight: '120px', animation: 'szFadeIn 0.15s ease-out' }}
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
            <span className="text-[10px] font-body text-ns-muted/60 tracking-widest uppercase">
              Recent Discussion
            </span>
            {preview.onlineCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-body text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                    <span className="text-[10px] font-body font-semibold text-ns-text">
                      @{msg.username}
                    </span>
                    {msg.isTheory && (
                      <TheoryIcon size={9} className="text-violet-400/70" strokeWidth={2} />
                    )}
                    <span className="text-[9px] font-body text-ns-muted/40 ml-auto flex-shrink-0">
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
                <span className="text-[10px] font-body text-violet-400 font-medium">Latest Theory</span>
              </div>
              <p className="text-[11px] font-body text-ns-muted/70 leading-snug line-clamp-2 italic">
                "{preview.latestTheory.content}"
              </p>
              <p className="text-[9px] font-body text-ns-muted/40 mt-0.5">
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
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg
                   text-ns-muted/50 hover:text-ns-text hover:bg-ns-surface/60
                   transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Card options"
      >
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5"  cy="12" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="19" cy="12" r="2"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-ns-surface border border-ns-border
                        rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => { setOpen(false); onAction(item.key) }}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-body
                          transition-colors
                          ${'danger' in item && item.danger
                            ? 'text-red-400/80 hover:text-red-400 hover:bg-red-500/5'
                            : 'text-ns-muted hover:text-ns-text hover:bg-ns-surface/60'
                          }`}
            >
              <span className="text-[11px] w-4 text-center">{item.icon}</span>
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
    hoverTimer.current = setTimeout(() => setShowPreview(true), 400)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setShowPreview(false)
  }, [])

  const hasUnread = m.unreadCount > 0

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300
          hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30
          ${m.pinned
            ? 'border-ns-gold/30 bg-ns-gold/3'
            : hasUnread
            ? 'border-ns-border/80 bg-ns-surface/60 hover:border-ns-gold/20'
            : 'border-ns-border/50 bg-ns-surface/40 hover:border-ns-border'
          }`}
      >
        {/* Pin indicator */}
        {m.pinned && (
          <div className="absolute top-3 left-3 z-10">
            <PinIcon size={10} className="text-ns-gold/70" strokeWidth={2} />
          </div>
        )}

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
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                             rounded-full bg-ns-gold text-black text-[9px] font-bold tabular-nums
                             animate-pulse shadow-sm shadow-ns-gold/30">
              {m.unreadCount > 99 ? '99+' : m.unreadCount}
            </span>
          </div>
        )}

        {/* Poster background */}
        <div className="relative h-36 overflow-hidden">
          {m.moviePoster ? (
            <>
              <Image
                src={`https://image.tmdb.org/t/p/w342${m.moviePoster}`}
                alt={m.movieTitle}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/40 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-ns-surface to-ns-bg flex items-center justify-center">
              <SpoilerZoneIcon size={36} className="text-ns-muted/20" />
            </div>
          )}

          {/* Active indicator */}
          {m.isActive && (
            <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ns-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ns-gold" />
              </span>
              <span className="text-[10px] font-body text-ns-gold font-medium tracking-wide">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-body font-semibold text-sm text-ns-text leading-tight mb-2.5 line-clamp-2 pr-5">
            {m.movieTitle}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <StatChip icon="👥" value={fmt(m.memberCount)} label="Members" />
            <StatChip icon="💬" value={fmt(m.messageCount)} label="Messages" />
          </div>

          {/* Last activity */}
          <p className="text-[10px] font-body text-ns-muted/50 mb-3">
            Last active {timeAgo(m.lastActivity)}
          </p>

          {/* CTA button */}
          <Link
            href={`/movie/${m.tmdbId}`}
            onClick={e => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-body font-semibold
                       bg-ns-gold/10 text-ns-gold border border-ns-gold/30
                       hover:bg-ns-gold hover:text-black hover:border-ns-gold
                       active:scale-[0.98] transition-all duration-200"
          >
            <SpoilerZoneIcon size={12} strokeWidth={2} />
            Open Spoiler Zone
          </Link>
        </div>
      </div>

      {/* Hover preview panel (positioned to the right) */}
      <HoverPreview tmdbId={m.tmdbId} visible={showPreview} />
    </div>
  )
}

function StatChip({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px]">{icon}</span>
      <span className="text-xs font-body font-semibold text-ns-text">{value}</span>
      <span className="text-[10px] font-body text-ns-muted/50">{label}</span>
    </div>
  )
}
