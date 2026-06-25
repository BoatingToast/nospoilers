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
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Watchlist</p>
          <div className="flex gap-4 mt-1">
            <span className="text-ns-text font-body text-xs">{stats.total} total</span>
            <span className="text-emerald-400 font-body text-xs">{stats.watched} watched</span>
          </div>
        </div>
        <Link href="/watchlist" className="text-ns-gold text-xs font-body hover:text-ns-gold/80 transition-colors">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-12 h-[72px] rounded-lg bg-ns-border animate-pulse flex-shrink-0" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-ns-muted text-xs font-body mb-2">Your watchlist is empty.</p>
          <Link href="/discover" className="text-ns-gold text-xs font-body hover:underline">
            Discover movies →
          </Link>
        </div>
      ) : (
        <div className="flex gap-2">
          {items.map(item => (
            <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group flex-shrink-0">
              <div className="w-12 h-[72px] rounded-lg overflow-hidden bg-ns-border relative">
                <Image
                  src={tmdbImageUrl(item.posterPath, 'w185')}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="48px"
                />
              </div>
            </Link>
          ))}
          {stats.wantToWatch > 5 && (
            <Link href="/watchlist" className="w-12 h-[72px] rounded-lg bg-ns-surface-2 border border-dashed border-ns-border flex items-center justify-center flex-shrink-0 hover:border-ns-gold/30 transition-colors">
              <span className="text-ns-muted text-xs font-body">+{stats.wantToWatch - 5}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
