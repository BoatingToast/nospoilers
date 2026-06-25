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

  const Stat = ({
    value,
    label,
    href,
  }: {
    value: number
    label: string
    href:  string
  }) => (
    <Link href={href} className="group">
      <p className="font-display text-3xl tracking-wider text-ns-gold group-hover:text-amber-400 transition-colors">
        {value.toLocaleString()}
      </p>
      <p className="text-ns-muted text-xs font-body mt-0.5">{label}</p>
    </Link>
  )

  return (
    <>
      <Stat value={counts.followers} label="Followers" href="/social/followers" />
      <Stat value={counts.following} label="Following" href="/social/following" />
      <Stat value={counts.friends}   label="Friends"   href="/social/friends"   />
    </>
  )
}
