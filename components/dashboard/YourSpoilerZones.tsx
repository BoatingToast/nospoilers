'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SpoilerZoneCard     from './SpoilerZoneCard'
import Button              from '@/components/ui/Button'
import EmptyState          from '@/components/ui/EmptyState'
import { SectionLink }     from './SectionHeading'
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
    <div className="animate-pulse overflow-hidden rounded-2xl bg-ns-surface">
      <div className="aspect-[16/9] bg-ns-surface-2" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-ns-surface-2" />
        <div className="h-3 w-1/2 rounded bg-ns-surface-2" />
        <div className="mt-1 h-11 rounded-full bg-ns-surface-2" />
      </div>
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

  const pinned = memberships.filter(m => m.pinned)
  const unpinned = memberships.filter(m => !m.pinned)
  const gridClasses = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section aria-labelledby="your-spoiler-zones-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 id="your-spoiler-zones-title" className="font-display text-2xl text-ns-text sm:text-3xl">Your Spoiler Zones</h2>
            {totalUnread > 0 && (
              <span
                key={totalUnread}
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ns-accent px-2 text-xs font-bold tabular-nums text-ns-secondary-foreground motion-safe:animate-fade-up"
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-base text-ns-muted">Continue the conversation.</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3">
          {activeCount > 0 && (
            <span className="flex items-center gap-2 text-sm text-ns-muted">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ns-accent" />
              </span>
              {activeCount} active
            </span>
          )}
          {lastRefresh && (
            <span className="hidden text-sm tabular-nums text-ns-muted sm:inline">
              Updated {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefresh)}
            </span>
          )}
          <SectionLink href="/spoiler-zones">Browse all</SectionLink>
        </div>
      </div>

      {loading ? (
        <div aria-hidden="true" className={gridClasses}>
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : memberships.length === 0 ? (
        <EmptyState
          title="You're not part of any Spoiler Zones yet"
          description="Join a Spoiler Zone from any movie page to discuss freely with other fans — spoilers welcome."
          action={<Button href="/spoiler-zones" variant="secondary" className="bg-ns-surface-2 hover:bg-ns-surface-3">Browse Popular Discussions</Button>}
        />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h3 className="mb-3 font-heading text-lg font-bold text-ns-text">Pinned</h3>
              <div className={gridClasses}>
                {pinned.map(m => (
                  <SpoilerZoneCard key={m.id} membership={m} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <h3 className="mb-3 font-heading text-lg font-bold text-ns-text">All Zones</h3>}
              <div className={gridClasses}>
                {unpinned.map(m => (
                  <SpoilerZoneCard key={m.id} membership={m} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
