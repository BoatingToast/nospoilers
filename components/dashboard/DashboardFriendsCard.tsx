'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FriendsIcon } from '@/components/icons'

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
  const initials    = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-ns-bg/30 transition-colors group">
      {/* Avatar */}
      <Link href={`/profile/${f.username}`} className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-ns-border ring-2 ring-ns-border/40 group-hover:ring-ns-gold/30 transition-all">
          {f.avatarUrl ? (
            <Image src={f.avatarUrl} alt={displayName} width={36} height={36} className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ns-gold/30 to-ns-border flex items-center justify-center">
              <span className="text-xs font-heading font-bold text-ns-gold">{initials}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-semibold text-ns-text truncate leading-tight">
          {displayName}
        </p>
        {f.personality ? (
          <p className="text-[10px] font-body text-ns-gold/60 truncate mt-0.5">{f.personality}</p>
        ) : (
          <p className="text-[10px] font-body text-ns-muted/40 truncate mt-0.5">@{f.username}</p>
        )}
      </div>

      {/* View Profile button */}
      <Link
        href={`/profile/${f.username}`}
        className="flex-shrink-0 text-[10px] font-body text-ns-muted/50 hover:text-ns-gold
                   border border-ns-border/50 hover:border-ns-gold/40
                   px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
      >
        View Profile
      </Link>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="divide-y divide-ns-border/20">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-ns-border flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-ns-border rounded w-1/3" />
            <div className="h-2.5 bg-ns-border/50 rounded w-1/2" />
          </div>
          <div className="h-6 w-20 bg-ns-border/40 rounded-lg" />
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
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-ns-border/50">
        <div className="flex items-center gap-2">
          <FriendsIcon size={15} className="text-ns-gold/70" />
          <span className="text-xs font-body font-semibold text-ns-text uppercase tracking-wide">
            Friends
          </span>
        </div>
        <Link
          href="/friends/find"
          className="text-[10px] font-body text-ns-muted/50 hover:text-ns-gold transition-colors"
        >
          Find more →
        </Link>
      </div>

      {/* List */}
      {loading ? (
        <Skeleton />
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-11 h-11 rounded-2xl bg-ns-border/30 flex items-center justify-center mb-3">
            <FriendsIcon size={20} className="text-ns-muted/30" />
          </div>
          <p className="text-ns-muted/60 text-sm font-body mb-1">No friends yet</p>
          <p className="text-ns-muted/40 text-xs font-body mb-3">
            When someone you follow follows you back, you become friends automatically.
          </p>
          <Link
            href="/friends/find"
            className="text-xs font-body text-ns-gold/80 hover:text-ns-gold
                       border border-ns-gold/30 hover:border-ns-gold/60
                       px-4 py-1.5 rounded-full transition-colors"
          >
            Find Friends
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-ns-border/20">
          {friends.map(f => <FriendItem key={f.id} f={f} />)}
        </div>
      )}

      {/* Footer */}
      {!loading && friends.length > 0 && (
        <div className="border-t border-ns-border/40 px-4 py-2.5">
          <Link
            href="/friends"
            className="text-xs font-body text-ns-muted/50 hover:text-ns-gold transition-colors"
          >
            View all friends →
          </Link>
        </div>
      )}
    </div>
  )
}
