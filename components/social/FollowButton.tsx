'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface Props {
  username:            string
  initialIsFollowing:  boolean
  initialIsFriend:     boolean
  /** Legacy prop — kept for compat but FollowButton now reads its own session */
  sessionUserId?:      string | null
  onToggle?: (state: { following: boolean; isFriend: boolean; followerCount: number }) => void
  size?: 'sm' | 'md' | 'lg'
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'error' | 'success' }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[9999] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded border
                  bg-ns-surface px-4 py-2.5 font-body text-sm
                  ${type === 'error'
                    ? 'border-ns-danger/40 text-ns-danger'
                    : 'border-ns-secondary/40 text-ns-secondary-readable'
                  }`}
    >
      {message}
    </div>
  )
}

// ── Friends icon ──────────────────────────────────────────────────────────────

function FriendsStarIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FollowButton({
  username,
  initialIsFollowing,
  initialIsFriend,
  onToggle,
  size = 'md',
}: Props) {
  const { data: session, status } = useSession()

  const [following,   setFollowing]   = useState(initialIsFollowing)
  const [isFriend,    setIsFriend]    = useState(initialIsFriend)
  const [hovered,     setHovered]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [justFollow,  setJustFollow]  = useState(false)
  const [toast,       setToast]       = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  // Sync if parent provides fresh props (e.g. after page re-fetch)
  useEffect(() => { setFollowing(initialIsFollowing) }, [initialIsFollowing])
  useEffect(() => { setIsFriend(initialIsFollowing && initialIsFriend) }, [initialIsFollowing, initialIsFriend])

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const toggle = useCallback(async () => {
    if (loading) return

    // Optimistic update
    const wasFollowing = following
    const wasFollowingFriend = isFriend
    setFollowing(!wasFollowing)
    if (wasFollowing) setIsFriend(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/follow/${username}`, { method: 'POST' })

      if (!res.ok) {
        // Revert
        setFollowing(wasFollowing)
        setIsFriend(wasFollowingFriend)
        const body = await res.json().catch(() => ({}))
        if (res.status === 401) {
          showToast('Please sign in to follow people', 'error')
        } else {
          showToast(body.error ?? 'Something went wrong — please try again', 'error')
        }
        return
      }

      const data: {
        following: boolean
        isFriend:  boolean
        followerCount: number
        followingCount: number
      } = await res.json()

      setFollowing(data.following)
      setIsFriend(data.isFriend)

      if (data.following && !wasFollowing) {
        setJustFollow(true)
        setTimeout(() => setJustFollow(false), 1200)
        if (data.isFriend) {
          showToast(`You and @${username} are now friends! 🎬`, 'success')
        }
      }

      onToggle?.({ following: data.following, isFriend: data.isFriend, followerCount: data.followerCount })
      // Notify LiveSocialStats (and any listener) on the same page so counts update immediately
      window.dispatchEvent(new CustomEvent('follow-updated', { detail: data }))

    } catch (err) {
      // Network error — revert
      setFollowing(wasFollowing)
      setIsFriend(wasFollowingFriend)
      showToast('Network error — please try again', 'error')
      console.error('[FollowButton] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, following, isFriend, username, showToast, onToggle])

  // ── Not authed ────────────────────────────────────────────────────────────

  // Shared Button has two compact sizes; `lg` keeps the roomier one.
  const buttonSize = size === 'sm' ? 'sm' : 'md'

  if (status === 'loading') {
    // Skeleton while session loads
    return (
      <div className={`animate-pulse rounded bg-ns-border/40 ${
        size === 'sm' ? 'h-8 w-16' : size === 'lg' ? 'h-10 w-24' : 'h-10 w-20'
      }`} />
    )
  }

  if (!session?.user?.id) {
    // Show a link-style prompt rather than a dead button
    return (
      <Button variant="secondary" size={buttonSize} href="/login">
        + Follow
      </Button>
    )
  }

  // ── Don't show Follow for own profile ────────────────────────────────────

  if (session.user.name === username) return null

  // ── Friend badge (shown when mutually followed) ───────────────────────────

  const friendBadge = isFriend && (
    <Badge variant="secondary" size="md">
      <FriendsStarIcon />
      Friends
    </Badge>
  )

  const busy = (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      …
    </span>
  )

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-wrap items-center gap-2">
        {friendBadge}

        {following ? (
          <Button
            variant={hovered ? 'danger' : 'outline'}
            size={buttonSize}
            onClick={toggle}
            disabled={loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {loading ? busy : hovered ? 'Unfollow' : '✓ Following'}
          </Button>
        ) : (
          <Button
            variant={justFollow ? 'primary' : 'secondary'}
            size={buttonSize}
            onClick={toggle}
            disabled={loading}
          >
            {loading ? busy : '+ Follow'}
          </Button>
        )}
      </div>
    </>
  )
}
