'use client'

import { useState, useEffect } from 'react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { SectionLink } from './SectionHeading'

interface FriendRow {
  id:           string
  username:     string
  displayName:  string | null
  avatarUrl:    string | null
  /** Human-readable personality name e.g. "The Thinker" — this is the Movie DNA title */
  personality:  string | null
}

function FriendItem({ f }: { f: FriendRow }) {
  const displayName = f.displayName ?? f.username
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar src={f.avatarUrl} username={f.username} size="sm" href />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight text-ns-text">{displayName}</p>
        <p className="mt-0.5 truncate text-sm text-ns-muted">{f.personality ?? `@${f.username}`}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        href={`/profile/${f.username}`}
        aria-label={`View ${displayName}'s profile`}
        className="flex-shrink-0 whitespace-nowrap hover:bg-ns-surface-2"
      >
        View Profile
      </Button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="divide-y divide-ns-border">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex animate-pulse items-center gap-3 py-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-ns-surface-2" />
            <div className="h-3 w-1/2 rounded bg-ns-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardFriendsCard() {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/friends')
      .then(r => r.ok ? r.json() : { friends: [] })
      .then((d: { friends: FriendRow[] }) => {
        setFriends(d.friends.slice(0, 6))
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Refresh when a follow action happens on the same page (e.g. someone mutual-follows)
    const handler = () => {
      fetch('/api/friends')
        .then(r => r.ok ? r.json() : { friends: [] })
        .then((d: { friends: FriendRow[] }) => setFriends(d.friends.slice(0, 6)))
        .catch(() => {})
    }
    window.addEventListener('follow-updated', handler)
    return () => window.removeEventListener('follow-updated', handler)
  }, [])

  return (
    <section aria-labelledby="dashboard-friends-title" className="flex flex-col rounded-2xl bg-ns-surface p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="dashboard-friends-title" className="font-heading text-xl font-bold text-ns-text">Friends</h2>
        <SectionLink href="/friends/find">Find more</SectionLink>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : friends.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-4">
          <p className="font-heading text-lg font-bold text-ns-text">No friends yet</p>
          <p className="text-base leading-relaxed text-ns-muted">
            When someone you follow follows you back, you become friends automatically.
          </p>
          <Button variant="secondary" href="/friends/find" className="bg-ns-surface-2 hover:bg-ns-surface-3">Find Friends</Button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-ns-border motion-safe:animate-fade-up">
            {friends.map(f => <FriendItem key={f.id} f={f} />)}
          </div>
          <div className="-ml-3 mt-2">
            <SectionLink href="/friends">View all friends</SectionLink>
          </div>
        </>
      )}
    </section>
  )
}
