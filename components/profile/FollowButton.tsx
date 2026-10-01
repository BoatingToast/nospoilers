'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

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
    <Button
      variant={following ? 'outline' : 'primary'}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? '...' : following ? 'Following' : 'Follow'}
    </Button>
  )
}
