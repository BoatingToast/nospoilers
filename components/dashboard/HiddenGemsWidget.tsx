'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import type { TMDbMovie } from '@/types'
import { StarIcon } from '@/components/icons'
import { SectionLink } from './SectionHeading'

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

  if (!loading && gems.length === 0) return null

  return (
    <section aria-labelledby="hidden-gems-title" className="rounded-2xl bg-ns-surface p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="hidden-gems-title" className="font-heading text-xl font-bold text-ns-text">Hidden Gems</h2>
          <p className="mt-0.5 text-sm text-ns-muted">High quality · Low profile</p>
        </div>
        <SectionLink href="/discover">Discover more</SectionLink>
      </div>

      {loading ? (
        <div aria-hidden="true" className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-2 aspect-[2/3] rounded-xl bg-ns-surface-2" />
              <div className="h-3 w-3/4 rounded bg-ns-surface-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {gems.map((gem, index) => (
            <div key={gem.id} className="ns-reveal group min-w-0" style={{ '--i': index } as React.CSSProperties}>
              <Link href={`/movie/${gem.id}`} className="block">
                <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface-2">
                  <Image
                    src={tmdbImageUrl(gem.poster_path, 'w185')}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    sizes="(max-width: 640px) 33vw, 120px"
                  />
                  <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                    <StarIcon size={12} />{gem.vote_average.toFixed(1)}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {gem.title}
                </p>
              </Link>
              <p className="mb-1.5 text-sm tabular-nums text-ns-muted">{formatYear(gem.release_date)}</p>
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
      )}
    </section>
  )
}
