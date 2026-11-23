'use client'

/**
 * LiveSocialStats — shows real-time Followers / Following / Friends counts
 * on the dashboard (or anywhere the viewer is looking at their own profile).
 *
 * • Hydrates from server-side initial counts (no flash)
 * • Refreshes from the follow API every 30 s
 * • Also listens for the global "follow-updated" CustomEvent dispatched by
 *   FollowButton so counts update immediately after an in-page follow action
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Props {
  username:        string
  initialFollowers: number
  initialFollowing: number
  initialFriends:   number
}

interface Counts {
  followers: number
  following: number
  friends:   number
}

export default function LiveSocialStats({
  username,
  initialFollowers,
  initialFollowing,
  initialFriends,
}: Props) {
  const [counts, setCounts] = useState<Counts>({
    followers: initialFollowers,
    following: initialFollowing,
    friends:   initialFriends,
  })

  const refresh = useCallback(() => {
    fetch(`/api/follow/${username}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { followerCount: number; followingCount: number; friendCount: number } | null) => {
        if (!d) return
        setCounts({
          followers: d.followerCount,
          following: d.followingCount,
          friends:   d.friendCount,
        })
      })
      .catch(() => {})
  }, [username])

  useEffect(() => {
    // Poll every 30 s
    const id = setInterval(refresh, 30_000)

    // Also refresh immediately when a follow action happens anywhere on the page
    const handler = () => refresh()
    window.addEventListener('follow-updated', handler)

    return () => {
      clearInterval(id)
      window.removeEventListener('follow-updated', handler)
    }
  }, [refresh])

  return (
    <>
      <Stat value={counts.followers} label="Followers" href="/friends/followers" />
      <Stat value={counts.following} label="Following" href="/friends/following" />
      <Stat value={counts.friends}   label="Friends"   href="/friends" />
    </>
  )
}

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <Link href={href} className="group block min-h-11">
      <p key={value} className="animate-fade-up font-display text-3xl tabular-nums text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-sm text-ns-muted">{label}</p>
    </Link>
  )
}
