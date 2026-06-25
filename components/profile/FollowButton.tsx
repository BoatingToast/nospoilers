'use client'

import { useState } from 'react'

interface Props {
  username:    string
  initialState: boolean
  sessionUserId: string | null
}

export default function FollowButton({ username, initialState, sessionUserId }: Props) {
  const [following, setFollowing] = useState(initialState)
  const [loading,   setLoading]   = useState(false)

  if (!sessionUserId) return null

  async function toggle() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/follow/${username}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setFollowing(data.following)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-5 py-2 rounded-xl text-sm font-body font-medium transition-all
        ${following
          ? 'bg-ns-surface border border-ns-border text-ns-muted hover:border-red-500/40 hover:text-red-400'
          : 'bg-ns-gold text-ns-bg hover:bg-ns-gold/90'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? '...' : following ? 'Following' : 'Follow'}
    </button>
  )
}
