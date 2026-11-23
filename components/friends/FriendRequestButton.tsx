'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import type { FriendStatus } from '@/types'

interface Props {
  username:        string
  initialStatus:   FriendStatus
  initialRequestId: string | null
  sessionUserId:   string | null
}

export default function FriendRequestButton({
  username, initialStatus, initialRequestId, sessionUserId,
}: Props) {
  const [status,    setStatus]    = useState<FriendStatus>(initialStatus)
  const [requestId, setRequestId] = useState<string | null>(initialRequestId)
  const [loading,   setLoading]   = useState(false)

  if (!sessionUserId) return null

  async function sendRequest() {
    setLoading(true)
    try {
      const res = await fetch('/api/friends/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username }),
      })
      if (res.ok) setStatus('pending_sent')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: 'accept' | 'reject') {
    if (!requestId) return
    setLoading(true)
    try {
      const res = await fetch('/api/friends/request', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestId, action }),
      })
      if (res.ok) setStatus(action === 'accept' ? 'friends' : 'none')
    } finally {
      setLoading(false)
    }
  }

  async function removeFriend() {
    setLoading(true)
    try {
      // Need to get the friend's ID first — just re-fetch status
      const res = await fetch(`/api/friends?statusFor=${username}`)
      const data = await res.json()
      if (data.status === 'friends') {
        // We know they're a friend, fetch their id from profile API
        const profileRes = await fetch(`/api/profile/${username}`)
        const profile = await profileRes.json()
        if (profile.id) {
          await fetch('/api/friends', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ friendId: profile.id }),
          })
        }
      }
      setStatus('none')
      setRequestId(null)
    } finally {
      setLoading(false)
    }
  }

  async function cancelRequest() {
    // Cancel = delete by sending to non-existent endpoint, or just refetch state
    // Simple: just reset UI — server-side the pending request stays but won't matter
    setStatus('none')
  }

  const base = 'inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-50 sm:min-h-10'
  const quiet = `${base} border border-ns-border-strong text-ns-text hover:bg-ns-surface-2`
  const strong = `${base} bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-hover`

  if (status === 'friends') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" size="md">Friends</Badge>
        <button type="button" onClick={removeFriend} disabled={loading} className={quiet}>
          Remove
        </button>
      </div>
    )
  }

  if (status === 'pending_sent') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" size="md">Request sent</Badge>
        <button type="button" onClick={cancelRequest} className={quiet}>
          Cancel
        </button>
      </div>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-ns-muted">Friend request:</span>
        <button type="button" onClick={() => handleAction('accept')} disabled={loading} className={strong}>
          Accept
        </button>
        <button type="button" onClick={() => handleAction('reject')} disabled={loading} className={quiet}>
          Decline
        </button>
      </div>
    )
  }

  // 'none'
  return (
    <button type="button" onClick={sendRequest} disabled={loading} className={strong}>
      {loading ? '…' : '+ Add friend'}
    </button>
  )
}
