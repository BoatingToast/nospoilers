'use client'

/**
 * UserSocialCard — person row used on Followers / Following / Friends pages.
 * The entire row is clickable (navigates to profile) except the Follow button.
 */

import { useState }              from 'react'
import Link                      from 'next/link'
import { useRouter }             from 'next/navigation'
import { useSession }            from 'next-auth/react'
import { CheckIcon, FriendsIcon, PlusIcon } from '@/components/icons'
import Avatar from '@/components/ui/Avatar'
import { growOnReveal } from '@/components/profile/motion'

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

// ── Taste match meter ────────────────────────────────────────────────────────

function TasteMatchMeter({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-10 overflow-hidden sm:w-16 rounded-full bg-ns-surface-3" aria-hidden="true">
        <span
          className={`block h-full rounded-full bg-ns-secondary ${growOnReveal}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ns-text">
        {pct}% match
      </span>
    </div>
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
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 min-w-28 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-wait sm:min-h-10
        ${following
          ? 'bg-ns-surface-3 text-ns-text hover:bg-ns-danger/10 hover:text-ns-danger'
          : 'border border-ns-border-strong text-ns-text hover:bg-ns-surface-3'
        }`}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="sr-only">Updating</span>
        </>
      ) : following ? (
        <>
          <CheckIcon size={14} />
          Following
        </>
      ) : (
        <>
          <PlusIcon size={14} />
          Follow
        </>
      )}
    </button>
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
      className="group flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors duration-150 hover:bg-ns-surface-2 sm:flex-nowrap sm:px-6"
      onClick={() => router.push(`/profile/${user.username}`)}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={user.avatarUrl} username={user.username} size="md" />
        {showFriendBadge && user.isFriend && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ns-accent text-ns-secondary-foreground ring-2 ring-ns-surface"
            title="Friend"
          >
            <FriendsIcon size={11} />
            <span className="sr-only">Friend</span>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={`/profile/${user.username}`}
          onClick={e => e.stopPropagation()}
          className="-my-1 block truncate py-1 font-heading text-base font-bold text-ns-text transition-colors group-hover:text-ns-secondary-readable"
        >
          {user.displayName ?? user.username}
        </Link>
        <p className="truncate text-sm text-ns-muted">
          @{user.username}
          {user.personality && <span> · {user.personality}</span>}
        </p>
        <p className="mt-1 truncate text-sm text-ns-subtle">
          <span className="tabular-nums">{user.followerCount.toLocaleString()}</span> follower{user.followerCount === 1 ? '' : 's'}
          {' · '}
          <span className="tabular-nums">{user.followingCount.toLocaleString()}</span> following
          {user.genres.length > 0 && <span className="hidden md:inline"> · {user.genres.slice(0, 3).join(', ')}</span>}
        </p>
      </div>

      <div
        className="flex w-full flex-shrink-0 items-center justify-between gap-2 pl-16 sm:w-auto sm:justify-end sm:gap-4 sm:pl-0"
        onClick={e => e.stopPropagation()}
      >
        {user.tasteMatch !== null ? <TasteMatchMeter pct={user.tasteMatch} /> : <span />}
        <InlineFollowBtn
          username={user.username}
          initial={user.isFollowing}
          onToggle={handleToggle}
        />
      </div>
    </div>
  )
}
