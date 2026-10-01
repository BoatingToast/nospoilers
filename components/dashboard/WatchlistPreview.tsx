'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'

export default function WatchlistPreview() {
  const [items,   setItems]   = useState<WatchlistItemData[]>([])
  const [stats,   setStats]   = useState({ total: 0, watched: 0, wantToWatch: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/watchlist?status=want_to_watch&sortBy=addedAt&stats=true')
      .then(r => r.json())
      .then(data => {
        setItems((data.items ?? []).slice(0, 5))
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="border-t border-ns-border pt-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="font-heading text-base font-semibold text-ns-text">Watchlist</h3>
          <p className="mt-1 font-body text-xs text-ns-muted">
            {stats.total} total · {stats.watched} watched
          </p>
        </div>
        <Link href="/watchlist" className="font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] w-12 flex-shrink-0 animate-pulse rounded bg-ns-surface-2" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="font-body text-sm text-ns-muted">
          Your watchlist is empty.{' '}
          <Link href="/discover" className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
            Discover movies →
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="flex-shrink-0">
              <div className="relative h-[72px] w-12 overflow-hidden rounded border border-ns-border bg-ns-surface-2 transition-colors hover:border-ns-text/60">
                <Image
                  src={tmdbImageUrl(item.posterPath, 'w185')}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            </Link>
          ))}
          {stats.wantToWatch > 5 && (
            <Link href="/watchlist" className="flex h-[72px] w-12 flex-shrink-0 items-center justify-center rounded border border-dashed border-ns-border transition-colors hover:border-ns-text/60">
              <span className="font-body text-xs text-ns-muted">+{stats.wantToWatch - 5}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
