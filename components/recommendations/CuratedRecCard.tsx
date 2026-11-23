'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import PosterImage from '@/components/discover/PosterImage'
import GrowBar from '@/components/movie/GrowBar'
import Badge from '@/components/ui/Badge'
import type { EnrichedRec } from '@/services/curated-recs'

const WhyModal = dynamic(() => import('./WhyModal'), { ssr: false })

interface Props {
  rec: EnrichedRec
}

export default function CuratedRecCard({ rec }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const strongestRating = rec.matchedRatings?.[0]
  const strongestFavorite = rec.similarToTitle ?? rec.matchedFavorites?.[0]
  const likedPick = rec.matchedLikedPicks?.[0]

  return (
    <>
      <div className="group flex w-44 flex-shrink-0 snap-start flex-col">
        {/* Only the poster reveals: the actions below can open fixed dialogs. */}
        <div className="ns-reveal">
          <Link
            href={`/movie/${rec.tmdbId}`}
            aria-label={`View ${rec.title}`}
            aria-hidden="true"
            tabIndex={-1}
            className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5"
          >
            <PosterImage
              path={rec.posterPath}
              sizes="176px"
              className="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
            />
            <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
              {rec.matchScore}%
            </span>
          </Link>
        </div>
        <GrowBar value={rec.matchScore / 100} className="mt-2 !h-1" />

        <Link href={`/movie/${rec.tmdbId}`} className="mt-2.5 rounded">
          <h3 className="line-clamp-2 font-heading text-base font-semibold leading-tight text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
            {rec.title}
          </h3>
        </Link>

        {rec.releaseDate && (
          <p className="mt-1 text-sm tabular-nums text-ns-muted">{formatYear(rec.releaseDate)}</p>
        )}

        {/* Show the strongest concrete reason directly on the card. */}
        {(strongestRating || likedPick || strongestFavorite) && (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-ns-subtle">
            {strongestRating
              ? `You rated ${strongestRating.title} ${strongestRating.score}`
              : likedPick
                ? `You liked ${likedPick}`
                : `Like ${strongestFavorite}`}
          </p>
        )}

        {rec.matchedTraits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {rec.matchedTraits.slice(0, 3).map(trait => (
              <Badge key={trait.trait}>{trait.trait}</Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <AddToWatchlistButton
            movie={{
              tmdbId:      rec.tmdbId,
              title:       rec.title,
              posterPath:  rec.posterPath,
              releaseDate: rec.releaseDate,
              genreIds:    rec.genreIds,
              voteAverage: rec.voteAverage,
            }}
            compact
          />
          <AddToCollectionButton
            movie={{
              tmdbId:      rec.tmdbId,
              title:       rec.title,
              posterPath:  rec.posterPath,
              releaseDate: rec.releaseDate,
            }}
            compact
          />
          <button
            type="button"
            onClick={() => setShowWhy(true)}
            aria-haspopup="dialog"
            aria-label={`Why? See why we picked ${rec.title}`}
            className="inline-flex min-h-11 flex-shrink-0 items-center rounded-full bg-ns-surface-2 px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
          >
            Why?
          </button>
        </div>
      </div>

      {showWhy && (
        <WhyModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </>
  )
}
