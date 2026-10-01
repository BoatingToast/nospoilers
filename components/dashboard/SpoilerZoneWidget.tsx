'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SZMembership } from '@/types'
import Badge from '@/components/ui/Badge'
import Section from '@/components/ui/Section'

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
      <Section title="SPOILER ZONES">
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 animate-pulse rounded bg-ns-surface-2" />
          ))}
        </div>
      </Section>
    )
  }

  if (memberships.length === 0) {
    return (
      <Section
        title="SPOILER ZONES"
        note="Join a Spoiler Zone from any movie page to discuss freely."
      />
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
    <Section
      title="SPOILER ZONES"
      action={
        <span className="font-body text-xs text-ns-muted">
          {memberships.length} joined
        </span>
      }
    >
      <ul className="border-b border-ns-border">
        {sorted.slice(0, 4).map(m => (
          <SZRow key={m.id} membership={m} />
        ))}
      </ul>

      {memberships.length > 4 && (
        <p className="mt-3 font-body text-xs text-ns-muted">
          +{memberships.length - 4} more zones
        </p>
      )}
    </Section>
  )
}

function SZRow({ membership }: { membership: SZMembership }) {
  const hasUnread = membership.unreadCount > 0

  return (
    <li className="border-t border-ns-border">
      <Link
        href={`/movie/${membership.tmdbId}`}
        className="group flex min-h-12 items-center justify-between gap-4 py-3"
      >
        <div className="min-w-0">
          <p className="line-clamp-1 font-body text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
            {membership.movieTitle}
          </p>
          <p className="mt-0.5 font-body text-xs text-ns-muted">
            {membership.memberCount.toLocaleString()} member{membership.memberCount !== 1 ? 's' : ''}
            {' · '}
            {membership.messageCount.toLocaleString()} posts
          </p>
        </div>
        {hasUnread && (
          <Badge variant="secondary" className="flex-shrink-0 tabular-nums">
            {membership.unreadCount > 99 ? '99+' : membership.unreadCount}
          </Badge>
        )}
      </Link>
    </li>
  )
}
