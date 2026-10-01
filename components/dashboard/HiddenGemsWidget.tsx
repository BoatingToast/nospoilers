'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import type { TMDbMovie } from '@/types'
import { StarIcon } from '@/components/icons'
import Section from '@/components/ui/Section'

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
      <Section title="Hidden Gems">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-2 aspect-[2/3] rounded bg-ns-surface-2" />
              <div className="h-2.5 w-3/4 rounded bg-ns-surface-2" />
            </div>
          ))}
        </div>
      </Section>
    )
  }

  if (gems.length === 0) return null

  return (
    <Section title="Hidden Gems" note="High quality · Low profile" href="/discover" linkLabel="Discover more →">
      <div className="grid grid-cols-3 gap-3">
        {gems.map(gem => (
          <div key={gem.id} className="group min-w-0">
            <Link href={`/movie/${gem.id}`}>
              <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface-2 transition-colors group-hover:border-ns-text/60">
                <Image
                  src={tmdbImageUrl(gem.poster_path, 'w185')}
                  alt={gem.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 120px"
                />
              </div>
            </Link>
            <p className="truncate font-body text-[11px] text-ns-muted transition-colors group-hover:text-ns-text">
              {gem.title}
            </p>
            <p className="mb-1.5 flex items-center gap-1.5 font-body text-[11px] text-ns-muted">
              {formatYear(gem.release_date)}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 font-bold text-ns-secondary-readable">
                <StarIcon size={8} />{gem.vote_average.toFixed(1)}
              </span>
            </p>
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
    </Section>
  )
}
