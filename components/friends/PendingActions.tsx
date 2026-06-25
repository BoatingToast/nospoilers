'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  requestId: string
  username:  string
}

export default function PendingActions({ requestId }: Props) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState<'accepted' | 'rejected' | null>(null)
  const router = useRouter()

  async function handle(action: 'accept' | 'reject') {
    setLoading(true)
    try {
      await fetch('/api/friends/request', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestId, action }),
      })
      setDone(action === 'accept' ? 'accepted' : 'rejected')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (done === 'accepted') return <span className="text-emerald-400 text-xs font-body">Friends</span>
  if (done === 'rejected') return <span className="text-ns-muted text-xs font-body">Declined</span>

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handle('accept')}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl text-xs font-body bg-ns-gold text-ns-bg hover:bg-amber-400 transition-colors disabled:opacity-50"
      >
        Accept
      </button>
      <button
        onClick={() => handle('reject')}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl text-xs font-body border border-ns-border text-ns-muted hover:text-ns-text transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  )
}
