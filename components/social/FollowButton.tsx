'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl
                  text-sm font-body shadow-2xl pointer-events-none
                  ${type === 'error'
                    ? 'bg-red-900/90 border border-red-500/40 text-red-200'
                    : 'bg-ns-surface border border-ns-gold/40 text-ns-gold'
                  }`}
      style={{ animation: 'szFadeIn 0.2s ease-out' }}
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

  if (status === 'loading') {
    // Skeleton while session loads
    return (
      <div className={`rounded-lg bg-ns-border/40 animate-pulse ${
        size === 'sm' ? 'w-16 h-7' : size === 'lg' ? 'w-24 h-10' : 'w-20 h-9'
      }`} />
    )
  }

  if (!session?.user?.id) {
    // Show a link-style prompt rather than a dead button
    return (
      <Link
        href="/login"
        className={`font-body font-semibold border transition-all duration-200
          ${size === 'sm' ? 'px-3 py-1.5 text-xs rounded-lg' : 'px-4 py-2 text-sm rounded-xl'}
          bg-ns-gold/10 text-ns-gold border-ns-gold/40 hover:bg-ns-gold hover:text-black hover:border-ns-gold`}
      >
        + Follow
      </Link>
    )
  }

  // ── Don't show Follow for own profile ────────────────────────────────────

  if (session.user.name === username) return null

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-2.5 text-sm rounded-xl',
  }
  const cls = sizes[size]

  // ── Friend badge (shown when mutually followed) ───────────────────────────

  const friendBadge = isFriend && (
    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body
                     bg-ns-gold/10 border border-ns-gold/30 text-ns-gold">
      <FriendsStarIcon />
      Friends
    </span>
  )

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center gap-2 flex-wrap">
        {friendBadge}

        {following ? (
          <button
            onClick={toggle}
            disabled={loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`${cls} font-body font-medium border transition-all duration-200 disabled:opacity-40
              ${hovered
                ? 'border-red-500/50 text-red-400 bg-red-500/8'
                : 'border-ns-border/60 text-ns-muted bg-transparent hover:border-ns-border'
              }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                …
              </span>
            ) : hovered ? 'Unfollow' : '✓ Following'}
          </button>
        ) : (
          <button
            onClick={toggle}
            disabled={loading}
            className={`${cls} font-body font-semibold border transition-all duration-200 disabled:opacity-40
              ${justFollow
                ? 'bg-ns-gold text-black border-ns-gold scale-105 shadow-lg shadow-ns-gold/25'
                : 'bg-ns-gold/10 text-ns-gold border-ns-gold/40 hover:bg-ns-gold hover:text-black hover:border-ns-gold hover:shadow-md hover:shadow-ns-gold/20 active:scale-[0.97]'
              }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                …
              </span>
            ) : '+ Follow'}
          </button>
        )}
      </div>
    </>
  )
}
