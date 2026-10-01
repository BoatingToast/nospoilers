'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SimilarUserPreview, PersonalityType } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

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
    <Section title="People With Similar Taste">
      {loading ? (
        <ul>
          {[1,2,3].map(i => (
            <li key={i} className="flex animate-pulse items-center gap-3 border-t border-ns-border py-3">
              <div className="h-10 w-10 rounded-full bg-ns-surface-2" />
              <div className="flex-1">
                <div className="mb-1 h-3 w-24 rounded bg-ns-surface-2" />
                <div className="h-2.5 w-32 rounded bg-ns-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      ) : users.length === 0 ? (
        <p className="border-t border-ns-border pt-4 font-body text-sm text-ns-muted">
          No similar users yet — as more people join, we&apos;ll find your matches.
        </p>
      ) : (
        <ul className="border-b border-ns-border">
          {users.map(user => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </Section>
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
    <li className="flex items-center gap-3 border-t border-ns-border py-3">
      <Avatar src={user.avatarUrl} username={user.username} size="md" href />

      <div className="min-w-0 flex-1">
        <Link href={`/profile/${user.username}`} className="transition-colors hover:text-ns-secondary-readable">
          <p className="truncate font-body text-sm font-medium text-ns-text">@{user.username}</p>
        </Link>
        <p className="font-body text-xs text-ns-muted">
          {user.sharedMovies} shared film{user.sharedMovies !== 1 ? 's' : ''}
          {pt ? ` · ${pt.name}` : ''}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <Link
          href={`/compatibility/${user.username}`}
          className="font-body text-sm tabular-nums text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text"
        >
          {user.compatScore}%
        </Link>
        <Button
          variant={following ? 'outline' : 'secondary'}
          size="sm"
          onClick={toggleFollow}
          disabled={loading}
          className="min-h-10"
        >
          {loading ? '...' : following ? 'Following' : 'Follow'}
        </Button>
      </div>
    </li>
  )
}
