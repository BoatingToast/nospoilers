'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import Card from '@/components/ui/Card'
import type { EnrichedRec } from '@/services/curated-recs'

const WhyModal = dynamic(() => import('./WhyModal'), { ssr: false })

interface Props {
  rec: EnrichedRec
}

function matchColor(score: number) {
  if (score >= 85) return { text: 'text-ns-success' }
  if (score >= 70) return { text: 'text-ns-secondary-readable' }
  if (score >= 55) return { text: 'text-ns-info' }
  return               { text: 'text-ns-muted' }
}

export default function CuratedRecCard({ rec }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const colors = matchColor(rec.matchScore)
  const strongestRating = rec.matchedRatings?.[0]
  const strongestFavorite = rec.similarToTitle ?? rec.matchedFavorites?.[0]
  const likedPick = rec.matchedLikedPicks?.[0]

  return (
    <>
      <div className="group w-[170px] flex-shrink-0 flex flex-col">
        {/* Poster */}
        <Link href={`/movie/${rec.tmdbId}`} className="block relative mb-3">
          <Card interactive className="relative h-[255px] w-[170px] overflow-hidden">
            <Image
              src={tmdbImageUrl(rec.posterPath, 'w342')}
              alt={rec.title}
              fill
              className="object-cover"
              sizes="170px"
            />
          </Card>
        </Link>

        {/* Title */}
        <Link href={`/movie/${rec.tmdbId}`}>
          <h3 className="text-ns-text text-xs font-body font-semibold leading-tight line-clamp-2
                         group-hover:text-ns-secondary-readable transition-colors mb-1">
            {rec.title}
          </h3>
        </Link>

        {/* Match and year on one plain line */}
        <p className="mb-1.5 font-body text-[11px] text-ns-muted">
          <span className={`font-semibold ${colors.text}`}>{rec.matchScore}%</span>
          {rec.releaseDate && <> · {formatYear(rec.releaseDate)}</>}
        </p>

        {/* Show the strongest concrete reason directly on the card. */}
        {(strongestRating || likedPick || strongestFavorite) && (
          <p className="text-ns-muted text-[11px] font-body leading-tight line-clamp-2 mb-1.5">
            {strongestRating ? (
              <>
                <span className="text-ns-muted/50">You rated </span>
                <span className="text-ns-muted">{strongestRating.title} {strongestRating.score}</span>
              </>
            ) : likedPick ? (
              <>
                <span className="text-ns-muted/50">You liked </span>
                <span className="text-ns-muted">{likedPick}</span>
              </>
            ) : (
              <>
                <span className="text-ns-muted/50">Like </span>
                <span className="text-ns-muted">{strongestFavorite}</span>
              </>
            )}
          </p>
        )}

        {/* Traits, as plain text */}
        {rec.matchedTraits.length > 0 && (
          <p className="mb-2 font-body text-[11px] leading-snug text-ns-muted">
            {rec.matchedTraits.slice(0, 3).map((t, index) => (
              <span key={t.trait}>
                {index > 0 && ' · '}
                {t.icon} {t.trait}
              </span>
            ))}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-1.5 mt-auto pt-1">
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
            onClick={() => setShowWhy(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded
                       border border-ns-border
                       text-ns-muted text-[11px] font-body
                       hover:border-ns-text hover:text-ns-text
                       transition-colors duration-150"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
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
