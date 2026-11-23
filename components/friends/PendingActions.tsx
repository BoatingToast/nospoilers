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

  if (done === 'accepted') return <span className="animate-fade-up text-sm font-semibold text-ns-success">Friends</span>
  if (done === 'rejected') return <span className="animate-fade-up text-sm font-semibold text-ns-muted">Declined</span>

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handle('accept')}
        disabled={loading}
        className="min-h-11 rounded-full bg-ns-text px-5 text-sm font-semibold text-ns-bg transition-colors duration-150 hover:bg-ns-muted disabled:cursor-wait disabled:opacity-50 sm:min-h-10"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => handle('reject')}
        disabled={loading}
        className="min-h-11 rounded-full px-4 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-text/10 disabled:cursor-wait disabled:opacity-50 sm:min-h-10"
      >
        Decline
      </button>
    </div>
  )
}
