'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { LockIcon, FilmIcon } from '@/components/icons'

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
    return (
      <p className="flex items-center gap-2 border-t border-ns-border py-6 text-sm font-body text-ns-muted">
        <LockIcon size={16} className="flex-shrink-0" /> This user's watchlist is private.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-ns-border rounded mb-2" />
            <div className="h-3 bg-ns-border rounded w-4/5" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="border-t border-ns-border py-6 text-sm font-body text-ns-muted">Watchlist is empty.</p>
    )
  }

  return (
    <div>
      <p className="text-ns-muted text-xs font-body mb-4">{items.length} films on watchlist</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map(item => (
          <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group">
            <div className="relative aspect-[2/3] rounded overflow-hidden bg-ns-border mb-2">
              {item.posterPath ? (
                <Image
                  src={tmdbImageUrl(item.posterPath, 'w342')}
                  alt={item.title}
                  fill
                  sizes="200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FilmIcon size={32} className="text-ns-muted/40" />
                </div>
              )}
              {item.status === 'watching' && (
                <div className="absolute bottom-2 left-2 bg-ns-secondary/90 rounded-sm px-1.5 py-0.5">
                  <span className="text-[11px] font-body font-bold text-ns-secondary-foreground">WATCHING</span>
                </div>
              )}
            </div>
            <p className="text-xs font-body text-white line-clamp-2 group-hover:text-ns-secondary-readable transition-colors">{item.title}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
