'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SZMembership } from '@/types'
import { SpoilerZoneIcon } from '@/components/icons'

export default function SpoilerZoneWidget() {
  const [memberships, setMemberships] = useState<SZMembership[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/user/spoiler-zones')
      .then(r => r.ok ? r.json() : [])
      .then((data: SZMembership[]) => setMemberships(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-ns-border bg-ns-surface/40 p-5">
        <div className="h-4 w-40 bg-ns-surface rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-ns-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (memberships.length === 0) {
    return (
      <div className="rounded-2xl border border-ns-border bg-ns-surface/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <SpoilerZoneIcon size={16} className="text-ns-gold/70" />
          <h3 className="font-display text-xs tracking-widest text-ns-gold/70">SPOILER ZONES</h3>
        </div>
        <p className="text-xs font-body text-ns-muted/60">
          Join a Spoiler Zone from any movie page to discuss freely.
        </p>
      </div>
    )
  }

  // Sort by unread first, then by last activity
  const sorted = [...memberships].sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="rounded-2xl border border-ns-border bg-ns-surface/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SpoilerZoneIcon size={16} className="text-ns-gold/70" />
          <h3 className="font-display text-xs tracking-widest text-ns-gold/70">SPOILER ZONES</h3>
        </div>
        <span className="text-[10px] font-body text-ns-muted/50">
          {memberships.length} joined
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sorted.slice(0, 4).map(m => (
          <SZCard key={m.id} membership={m} />
        ))}
      </div>

      {memberships.length > 4 && (
        <p className="text-[10px] font-body text-ns-muted/50 text-center mt-3">
          +{memberships.length - 4} more zones
        </p>
      )}
    </div>
  )
}

function SZCard({ membership }: { membership: SZMembership }) {
  const hasUnread = membership.unreadCount > 0

  return (
    <Link
      href={`/movie/${membership.tmdbId}`}
      className="group relative overflow-hidden rounded-xl border border-ns-border
                 hover:border-ns-gold/30 transition-all duration-200 hover:scale-[1.02]"
    >
      {/* Poster background */}
      {membership.moviePoster ? (
        <div className="absolute inset-0">
          <Image
            src={`https://image.tmdb.org/t/p/w200${membership.moviePoster}`}
            alt=""
            fill
            className="object-cover opacity-20 group-hover:opacity-30 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/80 to-ns-bg/40" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-ns-surface" />
      )}

      {/* Content */}
      <div className="relative p-3 min-h-[80px] flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-body font-semibold text-ns-text leading-tight line-clamp-2 mb-1">
            {membership.movieTitle}
          </p>
          <p className="text-[9px] font-body text-ns-muted/50">
            {membership.memberCount.toLocaleString()} member{membership.memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] font-body text-ns-muted/40">
            {membership.messageCount.toLocaleString()} posts
          </span>
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full
                             bg-ns-gold text-black text-[8px] font-bold tabular-nums">
              {membership.unreadCount > 99 ? '99+' : membership.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
