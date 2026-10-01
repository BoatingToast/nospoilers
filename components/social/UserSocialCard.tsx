'use client'

/**
 * UserSocialCard — ruled user row used on Followers / Following / Friends pages.
 *
 * Layout:
 *  [Avatar] [Name + @username + DNA badge + genres + meta] [Actions: Follow + View]
 *
 * The entire card is clickable (navigates to profile) except the Follow button.
 */

import { useState }              from 'react'
import Link                      from 'next/link'
import { useRouter }             from 'next/navigation'
import { useSession }            from 'next-auth/react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'

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
  const color = pct >= 60 ? 'text-ns-secondary-readable' : 'text-ns-muted'
  return (
    <span className={`font-body text-xs font-semibold ${color} whitespace-nowrap`}>
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
    <Button
      variant={following ? 'outline' : 'secondary'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="min-h-[40px] whitespace-nowrap"
    >
      {loading ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : following ? 'Following' : 'Follow'}
    </Button>
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

  const meta = [user.personality, ...user.genres.slice(0, 3)].filter(Boolean)

  return (
    <div
      className="group flex min-w-0 cursor-pointer flex-wrap items-center gap-x-4 gap-y-3 border-t border-ns-border py-4"
      onClick={() => router.push(`/profile/${user.username}`)}
    >
      {/* Avatar */}
      <Avatar
        src={user.avatarUrl}
        username={user.username}
        size="md"
        className="flex-shrink-0"
      />

      {/* Info */}
      <div className="min-w-0 flex-1 basis-40">
        {/* Name row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-body text-sm font-semibold leading-tight text-ns-text group-hover:underline group-hover:underline-offset-4">
            {user.displayName ?? user.username}
          </p>
          {showFriendBadge && user.isFriend && (
            <Badge variant="secondary" title="Friend">Friend</Badge>
          )}
          {user.tasteMatch !== null && (
            <TasteMatchBadge pct={user.tasteMatch} />
          )}
        </div>
        <p className="mt-0.5 truncate font-body text-xs text-ns-muted">@{user.username}</p>

        {/* DNA personality and genres */}
        {meta.length > 0 && (
          <p className="mt-1 font-body text-xs text-ns-muted">{meta.join(' · ')}</p>
        )}

        {/* Follower / following counts */}
        <p className="mt-1 font-body text-xs text-ns-muted">
          <span className="font-semibold text-ns-text">{user.followerCount.toLocaleString()}</span> followers
          {' · '}
          <span className="font-semibold text-ns-text">{user.followingCount.toLocaleString()}</span> following
        </p>
      </div>

      {/* Actions — stop propagation so row click doesn't fire */}
      <div className="flex flex-shrink-0 items-center gap-4">
        <Link
          href={`/profile/${user.username}`}
          onClick={e => e.stopPropagation()}
          className="inline-flex min-h-[40px] items-center whitespace-nowrap font-heading text-sm text-ns-muted underline-offset-4 transition-colors hover:text-ns-text hover:underline"
        >
          View Profile →
        </Link>
        <InlineFollowBtn
          username={user.username}
          initial={user.isFollowing}
          onToggle={handleToggle}
        />
      </div>
    </div>
  )
}
