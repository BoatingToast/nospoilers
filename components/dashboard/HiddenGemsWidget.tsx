'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import type { TMDbMovie } from '@/types'
import { StarIcon } from '@/components/icons'

export default function HiddenGemsWidget() {
  const [gems,    setGems]    = useState<TMDbMovie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hidden-gems')
      .then(r => r.json())
      .then(data => setGems(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Hidden Gems</p>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-ns-border mb-2" />
              <div className="h-2.5 bg-ns-border rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (gems.length === 0) return null

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Hidden Gems</p>
          <p className="text-ns-muted/50 text-[10px] font-body">High quality · Low profile</p>
        </div>
        <Link href="/discover" className="text-ns-gold text-xs font-body hover:text-ns-gold/80 transition-colors">
          Discover more →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {gems.map(gem => (
          <div key={gem.id} className="group">
            <Link href={`/movie/${gem.id}`}>
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-border relative mb-2">
                <Image
                  src={tmdbImageUrl(gem.poster_path, 'w185')}
                  alt={gem.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 33vw, 120px"
                />
                <div className="absolute top-1.5 right-1.5 bg-ns-bg/80 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                  <span className="text-ns-gold text-[9px] font-body font-bold flex items-center gap-0.5">
                    <StarIcon size={8} />{gem.vote_average.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
            <p className="text-ns-muted text-[10px] font-body truncate group-hover:text-ns-text transition-colors">
              {gem.title}
            </p>
            <p className="text-ns-muted/40 text-[9px] font-body mb-1.5">{formatYear(gem.release_date)}</p>
            <AddToWatchlistButton
              movie={{
                tmdbId:      gem.id,
                title:       gem.title,
                posterPath:  gem.poster_path,
                releaseDate: gem.release_date,
                genreIds:    gem.genre_ids,
                voteAverage: gem.vote_average,
              }}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  )
}
