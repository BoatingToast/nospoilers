'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SimilarUserPreview, PersonalityType } from '@/types'
import Avatar from '@/components/ui/Avatar'

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

  if (loading) {
    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">People With Similar Taste</p>
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-ns-border" />
              <div className="flex-1">
                <div className="h-3 bg-ns-border rounded w-24 mb-1" />
                <div className="h-2.5 bg-ns-border rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-6 text-center">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-3">People With Similar Taste</p>
        <p className="text-ns-muted text-xs font-body">
          No similar users yet — as more people join, we&apos;ll find your matches.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
        People With Similar Taste
      </p>

      <div className="flex flex-col gap-3">
        {users.map(user => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </div>
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

      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} className="hover:text-ns-gold transition-colors">
          <p className="text-ns-text text-sm font-body font-medium truncate">@{user.username}</p>
        </Link>
        <p className="text-ns-muted text-xs font-body">
          {user.sharedMovies} shared film{user.sharedMovies !== 1 ? 's' : ''}
          {pt ? ` · ${pt.name}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/compatibility/${user.username}`}
          className="text-ns-gold text-xs font-body hover:text-ns-gold/80 transition-colors"
        >
          {user.compatScore}%
        </Link>
        <button
          onClick={toggleFollow}
          disabled={loading}
          className={`px-3 py-1 rounded-lg text-xs font-body transition-all
            ${following
              ? 'border border-ns-border text-ns-muted hover:text-red-400'
              : 'bg-ns-gold/10 border border-ns-gold/30 text-ns-gold hover:bg-ns-gold/20'
            }
            ${loading ? 'opacity-50' : ''}
          `}
        >
          {loading ? '...' : following ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  )
}
