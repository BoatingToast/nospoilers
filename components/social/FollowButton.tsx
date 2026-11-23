'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { CheckIcon, FriendsIcon, PlusIcon } from '@/components/icons'

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

// Portaled so a transformed ancestor (a reveal wrapper, the header) cannot re-anchor it.
function Toast({ message, type }: { message: string; type: 'error' | 'success' }) {
  return createPortal(
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[90] mx-auto w-fit max-w-md animate-fade-up rounded-2xl bg-ns-surface-3 px-5 py-3 text-center text-sm font-semibold shadow-2xl
        ${type === 'error' ? 'text-ns-danger' : 'text-ns-text'}`}
    >
      {message}
    </div>,
    document.body,
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
          showToast(`You and @${username} are now friends!`, 'success')
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

  const compact = size === 'sm'
  const sizing = compact ? 'min-h-11 px-4 text-sm sm:min-h-10' : 'min-h-11 px-6 text-sm'

  if (status === 'loading') {
    // Skeleton while session loads
    return (
      <div className={`animate-pulse rounded-full bg-ns-surface-2 ${compact ? 'h-11 w-24 sm:h-10' : 'h-11 w-28'}`} />
    )
  }

  if (!session?.user?.id) {
    // Show a link-style prompt rather than a dead button
    return (
      <Link
        href="/login"
        className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors duration-150 ${sizing}
          ${compact
            ? 'border border-ns-border-strong text-ns-text hover:bg-ns-surface-2'
            : 'bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-hover'}`}
      >
        <PlusIcon size={14} />
        Follow
      </Link>
    )
  }

  // ── Don't show Follow for own profile ────────────────────────────────────

  if (session.user.name === username) return null

  // ── Friend badge (shown when mutually followed) ───────────────────────────

  const friendBadge = isFriend && (
    <Badge variant="secondary" size="md" className="animate-fade-up">
      <FriendsIcon size={14} />
      Friends
    </Badge>
  )

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-wrap items-center gap-2">
        {friendBadge}

        {following ? (
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            aria-busy={loading || undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors duration-150 disabled:cursor-wait ${sizing} ${compact ? 'min-w-28' : 'min-w-32'}
              ${hovered
                ? 'border-ns-danger bg-ns-danger/10 text-ns-danger'
                : 'border-ns-border-strong text-ns-text'
              }`}
          >
            {loading ? (
              <Spinner />
            ) : hovered ? 'Unfollow' : (
              <span key="following" className={`inline-flex items-center gap-1.5 ${justFollow ? 'animate-fade-up' : ''}`}>
                <CheckIcon size={14} />
                Following
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors duration-150 disabled:cursor-wait ${sizing} ${compact ? 'min-w-28 border border-ns-border-strong text-ns-text hover:bg-ns-surface-2' : 'min-w-32 bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-hover'}`}
          >
            {loading ? <Spinner /> : (
              <>
                <PlusIcon size={14} />
                Follow
              </>
            )}
          </button>
        )}
      </div>
    </>
  )
}

function Spinner() {
  return (
    <>
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="sr-only">Updating</span>
    </>
  )
}
