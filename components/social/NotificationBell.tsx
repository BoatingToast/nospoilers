'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  FriendsIcon, PersonIcon, CollectionsIcon, ReviewsIcon,
  AchievementsIcon, MovieDnaIcon, RecsIcon, SpoilerZoneIcon,
  NotificationsIcon,
} from '@/components/icons'
import type { NotificationItem } from '@/services/notifications'

// ── Icon resolver ─────────────────────────────────────────────────────────────

function NotifIcon({ icon, unread }: { icon: string; unread: boolean }) {
  const cls = `flex-shrink-0 ${unread ? 'text-ns-gold' : 'text-ns-muted/50'}`
  const size = 16
  switch (icon) {
    case 'person':      return <PersonIcon      size={size} className={cls} />
    case 'friends':     return <FriendsIcon     size={size} className={cls} />
    case 'collections': return <CollectionsIcon size={size} className={cls} />
    case 'reviews':     return <ReviewsIcon     size={size} className={cls} />
    case 'achievements':return <AchievementsIcon size={size} className={cls} />
    case 'dna':         return <MovieDnaIcon    size={size} className={cls} />
    case 'recs':        return <RecsIcon        size={size} className={cls} />
    case 'spoilerzone': return <SpoilerZoneIcon size={size} className={cls} />
    default:            return <NotificationsIcon size={size} className={cls} />
  }
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

function dayGroup(iso: string): 'today' | 'yesterday' | 'earlier' {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d >= today)     return 'today'
  if (d >= yesterday) return 'yesterday'
  return 'earlier'
}

// ── Bell SVG ──────────────────────────────────────────────────────────────────

function BellSvg({ ringing }: { ringing: boolean }) {
  return (
    <svg
      width={20} height={20} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={ringing ? 'animate-[bellRing_0.6s_ease-in-out]' : ''}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ── Single notification row ───────────────────────────────────────────────────

function NotifRow({
  n,
  onClose,
}: {
  n:       NotificationItem
  onClose: () => void
}) {
  return (
    <Link
      href={n.link}
      onClick={onClose}
      className={`flex items-start gap-3 px-4 py-3.5 transition-colors group relative
        ${n.read
          ? 'hover:bg-ns-bg/30'
          : 'bg-ns-gold/[0.04] hover:bg-ns-gold/[0.07] border-l-2 border-ns-gold/40'
        }`}
    >
      {/* Icon */}
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${n.read ? 'bg-ns-bg/50' : 'bg-ns-gold/10'}`}>
        <NotifIcon icon={n.icon} unread={!n.read} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-body font-semibold leading-tight
          ${n.read ? 'text-ns-muted' : 'text-ns-text'}`}>
          {n.title}
        </p>
        <p className={`text-xs font-body mt-0.5 leading-snug line-clamp-2
          ${n.read ? 'text-ns-muted/50' : 'text-ns-muted/80'}`}>
          {n.body}
        </p>
        <p className="text-[10px] font-body text-ns-muted/40 mt-1">
          {timeAgo(n.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-ns-gold mt-1.5 flex-shrink-0 shadow-sm shadow-ns-gold/50" />
      )}
    </Link>
  )
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 bg-ns-bg/40 border-y border-ns-border/30 sticky top-0 z-10">
      <p className="text-[10px] font-body font-semibold text-ns-muted/50 uppercase tracking-widest">
        {label}
      </p>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ns-border/40 flex items-center justify-center mb-4">
        <NotificationsIcon size={22} className="text-ns-muted/30" />
      </div>
      <p className="text-ns-muted/60 text-sm font-body">No notifications yet</p>
      <p className="text-ns-muted/40 text-xs font-body mt-1">
        Follow people and rate movies to get started
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open,     setOpen]    = useState(false)
  const [unread,   setUnread]  = useState(0)
  const [notifs,   setNotifs]  = useState<NotificationItem[]>([])
  const [loaded,   setLoaded]  = useState(false)
  const [ringing,  setRinging] = useState(false)
  const panelRef  = useRef<HTMLDivElement>(null)
  const prevUnread = useRef(0)

  // ── Poll unread count every 60 s ─────────────────────────────────────────

  const fetchCount = useCallback(() =>
    fetch('/api/notifications/count')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then((d: { count: number }) => {
        const n = d.count
        if (n > prevUnread.current && prevUnread.current >= 0) {
          // New notification arrived — ring the bell
          setRinging(true)
          setTimeout(() => setRinging(false), 650)
        }
        prevUnread.current = n
        setUnread(n)
      })
      .catch(() => {}),
  [])

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [fetchCount])

  // ── Click outside to close ───────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Open panel: fetch + auto-mark-all-read ───────────────────────────────

  const handleOpen = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (!next) return

    // Fetch if not yet loaded
    if (!loaded) {
      fetch('/api/notifications')
        .then(r => r.ok ? r.json() : { notifications: [] })
        .then((d: { notifications: NotificationItem[] }) => {
          setNotifs(d.notifications)
          setLoaded(true)
        })
        .catch(() => {})
    }

    // Mark all read after a short delay (feels intentional)
    if (unread > 0) {
      setTimeout(() => {
        fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
        setUnread(0)
        prevUnread.current = 0
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      }, 1200)
    }
  }, [open, loaded, unread])

  // ── Group notifications ──────────────────────────────────────────────────

  const groups: Record<'today' | 'yesterday' | 'earlier', NotificationItem[]> = {
    today:     [],
    yesterday: [],
    earlier:   [],
  }
  for (const n of notifs) {
    groups[dayGroup(n.createdAt)].push(n)
  }

  const labelMap = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        className={`relative p-2 rounded-xl transition-all duration-200
          ${open
            ? 'text-ns-gold bg-ns-gold/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
            : 'text-ns-muted hover:text-ns-text hover:bg-ns-bg/50'
          }`}
      >
        <BellSvg ringing={ringing} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                           rounded-full bg-ns-gold text-black text-[9px] font-body font-bold
                           flex items-center justify-center shadow-md shadow-ns-gold/30
                           animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[340px] bg-ns-surface border border-ns-border
                     rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px]"
          style={{ animation: 'szFadeIn 0.15s ease-out' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-ns-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <NotificationsIcon size={15} className="text-ns-gold/70" />
              <span className="text-xs font-body font-semibold text-ns-text tracking-wide uppercase">
                Notifications
              </span>
              {unread > 0 && (
                <span className="text-[10px] font-body text-ns-muted/50 ml-1">
                  {unread} unread
                </span>
              )}
            </div>
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-[10px] font-body text-ns-muted/50 hover:text-ns-gold transition-colors"
            >
              Settings
            </Link>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {!loaded ? (
              // Skeleton
              <div className="divide-y divide-ns-border/20">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-ns-border flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-ns-border rounded w-1/3" />
                      <div className="h-2.5 bg-ns-border rounded w-3/4" />
                      <div className="h-2 bg-ns-border rounded w-1/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <EmptyState />
            ) : (
              (['today', 'yesterday', 'earlier'] as const).map(key => (
                groups[key].length > 0 && (
                  <div key={key}>
                    <GroupLabel label={labelMap[key]} />
                    <div className="divide-y divide-ns-border/20">
                      {groups[key].map(n => (
                        <NotifRow key={n.id} n={n} onClose={() => setOpen(false)} />
                      ))}
                    </div>
                  </div>
                )
              ))
            )}
          </div>

          {/* Footer */}
          {loaded && notifs.length > 0 && (
            <div className="border-t border-ns-border/50 px-4 py-2.5 flex-shrink-0">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-body text-ns-muted/50 hover:text-ns-gold transition-colors"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
