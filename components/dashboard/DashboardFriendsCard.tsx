'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

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
    <li className="flex items-center gap-3 border-t border-ns-border py-3">
      <Avatar src={f.avatarUrl} username={f.username} size="sm" href />

      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-semibold leading-tight text-ns-text">
          {displayName}
        </p>
        {f.personality ? (
          <p className="mt-0.5 truncate font-body text-xs text-ns-secondary-readable">{f.personality}</p>
        ) : (
          <p className="mt-0.5 truncate font-body text-xs text-ns-muted">@{f.username}</p>
        )}
      </div>

      <Link
        href={`/profile/${f.username}`}
        className="flex-shrink-0 whitespace-nowrap font-body text-xs text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
      >
        View Profile
      </Link>
    </li>
  )
}

function Skeleton() {
  return (
    <ul>
      {[1, 2, 3].map(i => (
        <li key={i} className="flex animate-pulse items-center gap-3 border-t border-ns-border py-3">
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-ns-surface-2" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 rounded bg-ns-surface-2" />
            <div className="h-2.5 w-1/2 rounded bg-ns-surface-2" />
          </div>
        </li>
      ))}
    </ul>
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
    <Section title="Friends" href="/friends/find" linkLabel="Find more →">
      {loading ? (
        <Skeleton />
      ) : friends.length === 0 ? (
        <div className="border-t border-ns-border pt-4">
          <p className="font-body text-sm text-ns-text">No friends yet</p>
          <p className="mt-1 font-body text-sm leading-relaxed text-ns-muted">
            When someone you follow follows you back, you become friends automatically.
          </p>
          <Button variant="outline" size="sm" href="/friends/find" className="mt-4 min-h-10">
            Find Friends
          </Button>
        </div>
      ) : (
        <ul className="border-b border-ns-border">
          {friends.map(f => <FriendItem key={f.id} f={f} />)}
        </ul>
      )}

      {!loading && friends.length > 0 && (
        <p className="pt-3">
          <Link
            href="/friends"
            className="font-body text-sm text-ns-muted underline underline-offset-4 transition-colors hover:text-ns-text"
          >
            View all friends →
          </Link>
        </p>
      )}
    </Section>
  )
}
