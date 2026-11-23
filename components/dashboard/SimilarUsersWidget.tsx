'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SimilarUserPreview, PersonalityType } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

export default function SimilarUsersWidget() {
  const [users,   setUsers]   = useState<SimilarUserPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/similar')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section aria-labelledby="similar-users-title" className="rounded-2xl bg-ns-surface p-6">
      <h2 id="similar-users-title" className="mb-4 font-heading text-xl font-bold text-ns-text">People With Similar Taste</h2>

      {loading ? (
        <div aria-hidden="true" className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-ns-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-ns-surface-2" />
                <div className="h-3 w-40 rounded bg-ns-surface-2" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-base leading-relaxed text-ns-muted">
          No similar users yet — as more people join, we&apos;ll find your matches.
        </p>
      ) : (
        <ul className="divide-y divide-ns-border">
          {users.map((user, index) => (
            <li key={user.id} className="ns-reveal py-3 first:pt-0 last:pb-0" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
              <UserRow user={user} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UserRow({ user }: { user: SimilarUserPreview }) {
  const [following, setFollowing] = useState(user.isFollowing)
  const [loading,   setLoading]   = useState(false)
  const pt = user.personality as PersonalityType | null

  async function toggleFollow() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/follow/${user.username}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setFollowing(data.following)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar src={user.avatarUrl} username={user.username} size="md" href />

      <div className="min-w-0 flex-1">
        <Link href={`/profile/${user.username}`} className="block truncate text-base font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable">
          @{user.username}
        </Link>
        <p className="truncate text-sm text-ns-muted">
          {user.sharedMovies} shared film{user.sharedMovies !== 1 ? 's' : ''}
          {pt ? ` · ${pt.name}` : ''}
        </p>
      </div>

      <Link
        href={`/compatibility/${user.username}`}
        aria-label={`${user.compatScore}% compatibility with ${user.username}`}
        className="inline-flex min-h-10 flex-shrink-0 items-center rounded-full px-2 text-sm font-semibold tabular-nums text-ns-text transition-colors hover:text-ns-secondary-readable"
      >
        {user.compatScore}%
      </Link>
      <Button
        variant={following ? 'ghost' : 'secondary'}
        size="sm"
        onClick={toggleFollow}
        disabled={loading}
        aria-pressed={following}
        className={`flex-shrink-0 ${following ? '' : 'bg-ns-surface-2 hover:bg-ns-surface-3'}`}
      >
        {loading ? '...' : following ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}
