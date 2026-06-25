'use client'

import { useState, useEffect } from 'react'
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
  const [status,  setStatus]  = useState<WatchStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  // Check if already in watchlist
  useEffect(() => {
    fetch(`/api/watchlist?status=all&sortBy=addedAt`)
      .then(r => r.json())
      .then(data => {
        const item = (data.items ?? []).find((i: any) => i.tmdbId === movie.tmdbId)
        if (item) setStatus(item.status)
      })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [movie.tmdbId])

  async function handleClick() {
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
            ? 'bg-ns-gold/15 border border-ns-gold/30 text-ns-gold'
            : status === 'want_to_watch'
            ? 'bg-ns-surface border border-ns-border text-ns-muted hover:border-ns-gold/30 hover:text-ns-gold'
            : 'bg-ns-gold text-ns-bg hover:bg-ns-gold/90'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {loading ? '...' : status ? STATUS_LABELS[status] : (compact ? '+ List' : '+ Add to Watchlist')}
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
