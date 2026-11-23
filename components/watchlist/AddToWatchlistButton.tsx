'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { WatchStatus } from '@/types'
import { EyeIcon, CheckIcon, CloseIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

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
  watching:      <><EyeIcon size={16} />Watching</>,
  watched:       <><CheckIcon size={16} strokeWidth={2.5} />Watched</>,
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

  if (!checked) {
    return <div aria-hidden="true" className={cn('min-h-11 animate-pulse rounded-full bg-ns-surface', compact ? 'w-24' : 'w-40')} />
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-body text-sm font-semibold transition-colors duration-150 active:translate-y-px',
          compact ? 'px-4' : 'px-5',
          status === 'watched'
            ? 'bg-ns-success/10 text-ns-success hover:bg-ns-success/15'
            : status === 'watching'
            ? 'bg-ns-tile-rose text-ns-secondary-readable hover:bg-ns-surface-3'
            : status === 'want_to_watch'
            ? 'bg-ns-surface-2 text-ns-text hover:bg-ns-surface-3'
            : 'bg-ns-surface-2 text-ns-text hover:bg-ns-surface-3',
          loading ? 'cursor-wait' : 'cursor-pointer',
        )}
      >
        {loading
          ? 'Saving…'
          : status
            ? STATUS_LABELS[status]
            : authStatus === 'authenticated'
              ? (compact ? '+ List' : '+ Add to Watchlist')
              : (compact ? '+ List' : 'Sign in to save')}
      </button>

      {status && !loading && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-2 text-ns-muted transition-colors duration-150 hover:bg-ns-danger/10 hover:text-ns-danger"
          title="Remove from watchlist"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  )
}
