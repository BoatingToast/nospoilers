'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link                from 'next/link'
import SpoilerZoneCard     from './SpoilerZoneCard'
import { SpoilerZoneIcon } from '@/components/icons'
import { getSupabasePublicClient } from '@/lib/supabase-client'
import type { SZMembership } from '@/types'

// ── Sorting ───────────────────────────────────────────────────────────────────

function sortMemberships(list: SZMembership[]): SZMembership[] {
  return [...list].sort((a, b) => {
    // Pinned always first
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    // Unread > Active > Last Activity > Recently Joined > Alphabetical
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    const aT = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
    const bT = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
    if (bT !== aT) return bT - aT
    const aJ = new Date(a.joinedAt).getTime()
    const bJ = new Date(b.joinedAt).getTime()
    if (bJ !== aJ) return bJ - aJ
    return a.movieTitle.localeCompare(b.movieTitle)
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-ns-border/50 bg-ns-surface/40 overflow-hidden animate-pulse">
      <div className="h-36 bg-ns-surface" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-ns-surface rounded w-3/4" />
        <div className="h-3 bg-ns-surface rounded w-1/2" />
        <div className="h-3 bg-ns-surface rounded w-1/3" />
        <div className="h-8 bg-ns-surface rounded-xl mt-1" />
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-ns-surface border border-ns-border flex items-center justify-center">
          <SpoilerZoneIcon size={36} className="text-ns-muted/30" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-ns-gold/10 border border-ns-gold/20 flex items-center justify-center">
          <span className="text-ns-gold text-xs font-bold">+</span>
        </div>
      </div>
      <h3 className="font-body font-semibold text-ns-text mb-2">
        You&apos;re not part of any Spoiler Zones yet
      </h3>
      <p className="text-sm font-body text-ns-muted/60 mb-6 max-w-xs leading-relaxed">
        Join a Spoiler Zone from any movie page to discuss freely with other fans — spoilers welcome.
      </p>
      <Link
        href="/spoiler-zones"
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-body font-bold text-sm
                   bg-ns-gold text-black hover:bg-amber-400 active:scale-[0.97]
                   transition-all duration-200 shadow-lg shadow-ns-gold/20"
      >
        <SpoilerZoneIcon size={16} strokeWidth={2.5} />
        Browse Popular Discussions
      </Link>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000  // 30 seconds

export default function YourSpoilerZones() {
  const [memberships, setMemberships] = useState<SZMembership[]>([])
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const channelsRef  = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabasePublicClient>>['channel']>[]>([])
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchMemberships = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/user/spoiler-zones')
      if (!res.ok) return
      const data: SZMembership[] = await res.json()
      setMemberships(sortMemberships(data))
      setLastRefresh(new Date())
    } catch {}
    finally { if (!silent) setLoading(false) }
  }, [])

  // Initial load
  useEffect(() => { void fetchMemberships() }, [fetchMemberships])

  // Polling for live updates
  useEffect(() => {
    pollRef.current = setInterval(() => fetchMemberships(true), POLL_INTERVAL)
    const onFocus = () => fetchMemberships(true)
    window.addEventListener('focus', onFocus)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchMemberships])

  // Supabase Realtime — subscribe to each joined room's broadcast channel
  // to get push-triggered unread count bumps without waiting for the poll
  useEffect(() => {
    if (memberships.length === 0) return
    const supabase = getSupabasePublicClient()
    if (!supabase) return

    // Clean up previous subscriptions
    channelsRef.current.forEach(ch => void supabase.removeChannel(ch))
    channelsRef.current = []

    memberships.forEach(m => {
      const ch = supabase
        .channel(`sz-dashboard-${m.tmdbId}`)
        .on('broadcast', { event: 'sz_message' }, () => {
          // A new message arrived — bump this movie's unread count optimistically
          setMemberships(prev =>
            sortMemberships(prev.map(p =>
              p.tmdbId === m.tmdbId
                ? { ...p, unreadCount: p.unreadCount + 1, isActive: true, lastActivity: new Date().toISOString() }
                : p,
            )),
          )
        })
        .subscribe()
      channelsRef.current.push(ch)
    })

    return () => {
      channelsRef.current.forEach(ch => void supabase.removeChannel(ch))
      channelsRef.current = []
    }
  // Only re-subscribe when the set of joined tmdbIds changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships.map(m => m.tmdbId).join(',')])

  // ── Card actions ───────────────────────────────────────────────────────────

  const handleAction = useCallback(async (tmdbId: number, action: string) => {
    if (action === 'open') {
      window.location.href = `/movie/${tmdbId}`
      return
    }
    if (action === 'leave') {
      if (!confirm('Leave this Spoiler Zone? You can always rejoin later.')) return
      await fetch(`/api/user/spoiler-zones/${tmdbId}`, { method: 'DELETE' })
      setMemberships(prev => prev.filter(m => m.tmdbId !== tmdbId))
      return
    }
    // All other actions are PATCH
    await fetch(`/api/user/spoiler-zones/${tmdbId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action }),
    })
    // Optimistic UI updates
    setMemberships(prev => sortMemberships(prev.map(m => {
      if (m.tmdbId !== tmdbId) return m
      switch (action) {
        case 'pin':       return { ...m, pinned: true,  pinnedAt: new Date().toISOString() }
        case 'unpin':     return { ...m, pinned: false, pinnedAt: null }
        case 'mute':      return { ...m, notificationsEnabled: false }
        case 'unmute':    return { ...m, notificationsEnabled: true }
        case 'mark_read': return { ...m, unreadCount: 0 }
        default:          return m
      }
    })))
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalUnread  = memberships.reduce((sum, m) => sum + m.unreadCount, 0)
  const activeCount  = memberships.filter(m => m.isActive).length

  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <SpoilerZoneIcon size={20} className="text-ns-gold" />
            <h2 className="font-display text-xl tracking-widest text-ns-gold">YOUR SPOILER ZONES</h2>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                               rounded-full bg-ns-gold text-black text-[10px] font-bold tabular-nums
                               shadow-sm shadow-ns-gold/30">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <p className="text-ns-muted/60 text-sm font-body ml-8">Continue the conversation.</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ns-gold opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ns-gold" />
              </span>
              <span className="text-[11px] font-body text-ns-gold/80">
                {activeCount} active
              </span>
            </div>
          )}
          {lastRefresh && (
            <span className="text-[10px] font-body text-ns-muted/30 hidden sm:inline">
              Updated {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefresh)}
            </span>
          )}
          <Link
            href="/spoiler-zones"
            className="text-xs font-body text-ns-muted/60 hover:text-ns-gold transition-colors"
          >
            Browse all →
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : memberships.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Pinned row (if any) */}
          {memberships.some(m => m.pinned) && (
            <div className="space-y-2">
              <p className="text-[10px] font-body text-ns-muted/40 tracking-widest uppercase ml-0.5">
                Pinned
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {memberships
                  .filter(m => m.pinned)
                  .map(m => (
                    <SpoilerZoneCard key={m.id} membership={m} onAction={handleAction} />
                  ))}
              </div>
            </div>
          )}

          {/* All zones grid */}
          {memberships.some(m => !m.pinned) && (
            <div className="space-y-2">
              {memberships.some(m => m.pinned) && (
                <p className="text-[10px] font-body text-ns-muted/40 tracking-widest uppercase ml-0.5">
                  All Zones
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {memberships
                  .filter(m => !m.pinned)
                  .map(m => (
                    <SpoilerZoneCard key={m.id} membership={m} onAction={handleAction} />
                  ))}
              </div>
            </div>
          )}

          {/* Footer link */}
          <div className="text-center pt-2">
            <Link
              href="/spoiler-zones"
              className="inline-flex items-center gap-2 text-xs font-body text-ns-muted/50
                         hover:text-ns-gold transition-colors"
            >
              <SpoilerZoneIcon size={12} />
              Browse popular discussions
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
