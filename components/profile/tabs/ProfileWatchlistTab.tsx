'use client'

import { useEffect, useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import PosterTile, { posterGridClass } from './PosterTile'

interface WatchItem {
  tmdbId:    number
  title:     string
  posterPath: string | null
  status:    string
  addedAt:   string
}

export default function ProfileWatchlistTab({ username }: { username: string }) {
  const [items,   setItems]   = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    fetch(`/api/profile/${username}/tabs?tab=watchlist`)
      .then(r => {
        if (r.status === 403) { setBlocked(true); return null }
        return r.json()
      })
      .then(data => { if (data) setItems(data.watchlist ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  if (blocked) {
    return <EmptyState title="This user's watchlist is private." />
  }

  if (loading) {
    return (
      <div className={posterGridClass}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-ns-surface" />
            <div className="mt-2.5 h-4 w-4/5 rounded-sm bg-ns-surface" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <EmptyState title="Watchlist is empty." />
  }

  return (
    <div>
      <p className="mb-4 text-sm tabular-nums text-ns-muted">{items.length} films on watchlist</p>
      <div className={posterGridClass}>
        {items.map((item, index) => (
          <PosterTile
            key={item.tmdbId}
            index={index}
            tmdbId={item.tmdbId}
            title={item.title}
            posterPath={item.posterPath}
            overlay={item.status === 'watching' ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-ns-secondary px-2.5 py-0.5 text-xs font-bold text-ns-secondary-foreground">
                Watching
              </span>
            ) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
