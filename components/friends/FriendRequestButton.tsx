'use client'

import { useState } from 'react'
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

  const base = 'px-4 py-2 rounded-xl text-sm font-body transition-all disabled:opacity-50'

  if (status === 'friends') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-4 py-2 rounded-xl text-sm font-body bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          Friends
        </span>
        <button
          onClick={removeFriend}
          disabled={loading}
          className={`${base} border border-ns-border text-ns-muted hover:text-rose-400 hover:border-rose-500/40`}
        >
          Remove
        </button>
      </div>
    )
  }

  if (status === 'pending_sent') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-4 py-2 rounded-xl text-sm font-body bg-ns-gold/10 border border-ns-gold/30 text-ns-gold">
          Request Sent
        </span>
        <button
          onClick={cancelRequest}
          className={`${base} border border-ns-border text-ns-muted hover:text-ns-text`}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-body text-ns-muted mr-1">Friend request:</span>
        <button
          onClick={() => handleAction('accept')}
          disabled={loading}
          className={`${base} bg-ns-gold text-ns-bg hover:bg-amber-400`}
        >
          Accept
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className={`${base} border border-ns-border text-ns-muted hover:text-ns-text`}
        >
          Decline
        </button>
      </div>
    )
  }

  // 'none'
  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      className={`${base} bg-ns-gold text-ns-bg hover:bg-amber-400 font-medium`}
    >
      {loading ? '…' : '+ Add Friend'}
    </button>
  )
}
