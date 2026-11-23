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
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`min-h-11 rounded-full px-6 text-sm font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-50
        ${following
          ? 'border border-ns-border-strong text-ns-text hover:bg-ns-danger/10 hover:text-ns-danger'
          : 'bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-hover'
        }`}
    >
      {loading ? '...' : following ? 'Following' : 'Follow'}
    </button>
  )
}
