'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link                from 'next/link'
import SpoilerZoneCard     from './SpoilerZoneCard'
import Badge   from '@/components/ui/Badge'
import Button  from '@/components/ui/Button'
import Section from '@/components/ui/Section'
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
    <div className="animate-pulse overflow-hidden rounded border border-ns-border">
      <div className="h-36 bg-ns-surface-2" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-ns-surface-2" />
        <div className="h-3 w-1/2 rounded bg-ns-surface-2" />
        <div className="mt-1 h-8 rounded bg-ns-surface-2" />
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border-t border-ns-border pt-4">
      <h3 className="font-heading text-base font-semibold text-ns-text">
        You&apos;re not part of any Spoiler Zones yet
      </h3>
      <p className="mt-1 max-w-xl font-body text-sm leading-relaxed text-ns-muted">
        Join a Spoiler Zone from any movie page to discuss freely with other fans — spoilers welcome.
      </p>
      <Button variant="secondary" href="/spoiler-zones" className="mt-4">
        Browse Popular Discussions
      </Button>
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
    <Section
      title="YOUR SPOILER ZONES"
      note="Continue the conversation."
      action={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {totalUnread > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
          {activeCount > 0 && (
            <span className="font-body text-xs text-ns-secondary-readable">
              {activeCount} active
            </span>
          )}
          {lastRefresh && (
            <span className="hidden font-body text-xs text-ns-muted sm:inline">
              Updated {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(lastRefresh)}
            </span>
          )}
          <Link
            href="/spoiler-zones"
            className="font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
          >
            Browse all →
          </Link>
        </div>
      }
    >
      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : memberships.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {/* Pinned row (if any) */}
          {memberships.some(m => m.pinned) && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-ns-text">
                Pinned
              </h3>
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
            <div>
              {memberships.some(m => m.pinned) && (
                <h3 className="mb-3 font-heading text-sm font-semibold text-ns-text">
                  All Zones
                </h3>
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
          <p className="border-t border-ns-border pt-3">
            <Link
              href="/spoiler-zones"
              className="font-body text-sm text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
            >
              Browse popular discussions
            </Link>
          </p>
        </div>
      )}
    </Section>
  )
}
