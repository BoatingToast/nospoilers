'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { WatchStatus } from '@/types'
import { EyeIcon, CheckIcon } from '@/components/icons'

interface Movie {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  genreIds:    number[]
  runtime?:    number | null
  voteAverage?: number | null
}

interface Props {
  movie:  Movie
  compact?: boolean
}

const STATUS_LABELS: Record<WatchStatus, React.ReactNode> = {
  want_to_watch: '+ Watchlist',
  watching:      <><EyeIcon size={12} className="inline-block mr-1" />Watching</>,
  watched:       <><CheckIcon size={12} className="inline-block mr-1" />Watched</>,
}

const STATUS_CYCLE: Record<WatchStatus, WatchStatus> = {
  want_to_watch: 'watched',
  watching:      'watched',
  watched:       'watching',
}

export default function AddToWatchlistButton({ movie, compact = false }: Props) {
  const { status: authStatus } = useSession()
  const router = useRouter()
  const [status,  setStatus]  = useState<WatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  // Check if already in watchlist
  useEffect(() => {
    if (authStatus === 'loading') return
    if (authStatus !== 'authenticated') {
      setStatus(null)
      setChecked(true)
      return
    }

    setChecked(false)
    fetch(`/api/watchlist/${movie.tmdbId}`)
      .then(r => r.json())
      .then(data => {
        setStatus(data.status ?? null)
      })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [authStatus, movie.tmdbId])

  async function handleClick() {
    if (authStatus !== 'authenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/movie/${movie.tmdbId}`)}`)
      return
    }

    setLoading(true)
    try {
      if (!status) {
        // Add to watchlist
        const res = await fetch('/api/watchlist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...movie, status: 'want_to_watch' }),
        })
        if (res.ok) setStatus('want_to_watch')
      } else {
        // Cycle status
        const next = STATUS_CYCLE[status]
        const res  = await fetch(`/api/watchlist/${movie.tmdbId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ status: next }),
        })
        if (res.ok) setStatus(next)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    await fetch(`/api/watchlist/${movie.tmdbId}`, { method: 'DELETE' })
    setStatus(null)
    setLoading(false)
  }

  if (!checked) return null

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 rounded-xl font-body text-sm font-medium transition-all
          ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'}
          ${status === 'watched'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            : status === 'watching'
            ? 'bg-ns-secondary/15 border border-ns-secondary/30 text-ns-secondary-readable'
            : status === 'want_to_watch'
            ? 'bg-ns-surface border border-ns-border text-ns-muted hover:border-ns-secondary/30 hover:text-ns-secondary-readable'
            : 'bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary/90'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {loading
          ? '...'
          : status
            ? STATUS_LABELS[status]
            : authStatus === 'authenticated'
              ? (compact ? '+ List' : '+ Add to Watchlist')
              : (compact ? '+ List' : 'Sign in to save')}
      </button>

      {status && !loading && (
        <button
          onClick={handleRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center text-ns-muted/40 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
          title="Remove from watchlist"
        >
          ×
        </button>
      )}
    </div>
  )
}
