'use client'

/**
 * UserSocialCard — premium user card used on Followers / Following / Friends pages.
 *
 * Layout:
 *  [Avatar] [Name + @username + DNA badge + genres + meta] [Actions: Follow + View]
 *
 * The entire card is clickable (navigates to profile) except the Follow button.
 */

import { useState }              from 'react'
import Link                      from 'next/link'
import Image                     from 'next/image'
import { useRouter }             from 'next/navigation'
import { useSession }            from 'next-auth/react'
import { FriendsIcon, MovieDnaIcon } from '@/components/icons'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SocialUser {
  id:             string
  username:       string
  displayName:    string | null
  avatarUrl:      string | null
  personality:    string | null   // "The Thinker" (already resolved)
  genres:         string[]
  followerCount:  number
  followingCount: number
  isFollowing:    boolean
  isFriend:       boolean
  tasteMatch:     number | null
  /** ISO string — when the relationship started */
  followedAt?:    string
  friendSince?:   string
}

// ── Taste match ring ─────────────────────────────────────────────────────────

function TasteMatchBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'text-ns-gold' : pct >= 60 ? 'text-amber-400' : 'text-ns-muted/60'
  return (
    <span className={`text-[10px] font-body font-semibold ${color} whitespace-nowrap`}>
      {pct}% match
    </span>
  )
}

// ── Inline follow button (no external toast — self-contained) ─────────────────

function InlineFollowBtn({
  username,
  initial,
  onToggle,
}: {
  username: string
  initial:  boolean
  onToggle: (next: boolean) => void
}) {
  const { status } = useSession()
  const [following, setFollowing] = useState(initial)
  const [loading,   setLoading]   = useState(false)

  if (status !== 'authenticated') return null

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    const next = !following
    setFollowing(next)
    try {
      const res = await fetch(`/api/follow/${username}`, { method: 'POST' })
      if (!res.ok) { setFollowing(!next); return }
      const data = await res.json()
      const actual = data.following as boolean
      setFollowing(actual)
      onToggle(actual)
      window.dispatchEvent(new CustomEvent('follow-updated', { detail: data }))
    } catch {
      setFollowing(!next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all duration-200 whitespace-nowrap
        ${following
          ? 'bg-ns-border/60 text-ns-muted hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/30 border border-transparent'
          : 'bg-ns-gold text-black hover:bg-amber-400 border border-transparent'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : following ? 'Following' : 'Follow'}
    </button>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 48 }: { user: SocialUser; size?: number }) {
  const initial = (user.displayName ?? user.username).charAt(0).toUpperCase()
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 ring-2 ring-ns-border/40"
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={user.username}
          width={size} height={size}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-ns-gold/25 to-ns-border flex items-center justify-center">
          <span className="font-heading font-bold text-ns-gold" style={{ fontSize: size * 0.35 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function UserSocialCard({
  user: initialUser,
  showFriendBadge = true,
}: {
  user:            SocialUser
  showFriendBadge?: boolean
}) {
  const router  = useRouter()
  const [user, setUser] = useState(initialUser)

  const handleToggle = (following: boolean) => {
    setUser(u => ({ ...u, isFollowing: following }))
  }

  return (
    <div
      className="group relative bg-ns-surface border border-ns-border/60 rounded-2xl
                 hover:border-ns-gold/25 hover:shadow-[0_0_20px_rgba(212,175,55,0.06)]
                 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => router.push(`/profile/${user.username}`)}
    >
      {/* Subtle gold shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-ns-gold/0 to-ns-gold/0 group-hover:from-ns-gold/[0.02] group-hover:to-transparent transition-all duration-500 pointer-events-none rounded-2xl" />

      <div className="flex items-center gap-4 p-4 relative">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar user={user} size={52} />
          {showFriendBadge && user.isFriend && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ns-gold
                         flex items-center justify-center shadow-sm"
              title="Friend"
            >
              <FriendsIcon size={10} className="text-black" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-body font-semibold text-ns-text leading-tight truncate">
              {user.displayName ?? user.username}
            </p>
            {user.tasteMatch !== null && (
              <TasteMatchBadge pct={user.tasteMatch} />
            )}
          </div>
          <p className="text-[11px] font-body text-ns-muted/60 mt-0.5">@{user.username}</p>

          {/* DNA badge */}
          {user.personality && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-1 bg-ns-gold/10 border border-ns-gold/25 rounded-full px-2 py-0.5">
                <MovieDnaIcon size={10} className="text-ns-gold/70 flex-shrink-0" />
                <span className="text-[10px] font-body text-ns-gold/80 font-medium whitespace-nowrap">
                  {user.personality}
                </span>
              </div>
            </div>
          )}

          {/* Genres */}
          {user.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.genres.slice(0, 3).map(g => (
                <span
                  key={g}
                  className="text-[9px] font-body text-ns-muted/50 bg-ns-border/30 rounded-full px-2 py-0.5"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Follower / following counts */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-body text-ns-muted/50">
              <span className="text-ns-text/70 font-semibold">{user.followerCount.toLocaleString()}</span> followers
            </span>
            <span className="text-[10px] font-body text-ns-muted/50">
              <span className="text-ns-text/70 font-semibold">{user.followingCount.toLocaleString()}</span> following
            </span>
          </div>
        </div>

        {/* Actions — stop propagation so card click doesn't fire */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <InlineFollowBtn
            username={user.username}
            initial={user.isFollowing}
            onToggle={handleToggle}
          />
          <Link
            href={`/profile/${user.username}`}
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-body text-ns-muted/50 hover:text-ns-gold transition-colors whitespace-nowrap"
          >
            View Profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
