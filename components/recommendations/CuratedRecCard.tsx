'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import type { EnrichedRec } from '@/services/curated-recs'

const WhyModal = dynamic(() => import('./WhyModal'), { ssr: false })

interface Props {
  rec: EnrichedRec
}

function matchColor(score: number) {
  if (score >= 85) return { text: 'text-emerald-400', dot: 'bg-emerald-400', bar: '#34d399' }
  if (score >= 70) return { text: 'text-ns-gold',     dot: 'bg-ns-gold',     bar: '#C8963E' }
  if (score >= 55) return { text: 'text-blue-400',    dot: 'bg-blue-400',    bar: '#60a5fa' }
  return               { text: 'text-ns-muted',       dot: 'bg-ns-muted',    bar: '#52506A' }
}

export default function CuratedRecCard({ rec }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const colors = matchColor(rec.matchScore)

  return (
    <>
      <div className="group w-[170px] flex-shrink-0 flex flex-col">
        {/* Poster */}
        <Link href={`/movie/${rec.tmdbId}`} className="block relative mb-3">
          <div className="relative w-[170px] h-[255px] rounded-xl overflow-hidden border border-ns-border
                          group-hover:border-ns-gold/30 transition-all duration-300
                          group-hover:shadow-[0_0_20px_rgba(200,150,62,0.1)]">
            <Image
              src={tmdbImageUrl(rec.posterPath, 'w342')}
              alt={rec.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="170px"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-black/10 to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Match badge — always visible */}
          <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full
                           bg-ns-bg/85 backdrop-blur-sm border border-white/10`}>
            <div className={`w-1 h-1 rounded-full ${colors.dot}`} />
            <span className={`text-[10px] font-body font-semibold ${colors.text}`}>
              {rec.matchScore}%
            </span>
          </div>
        </Link>

        {/* Title */}
        <Link href={`/movie/${rec.tmdbId}`}>
          <h3 className="text-ns-text text-[12px] font-body font-semibold leading-tight line-clamp-2
                         group-hover:text-ns-gold transition-colors mb-1">
            {rec.title}
          </h3>
        </Link>

        {rec.releaseDate && (
          <p className="text-ns-muted/50 text-[10px] font-body mb-1.5">
            {formatYear(rec.releaseDate)}
          </p>
        )}

        {/* "Because you liked" — show the specific attribution if available */}
        {(rec.similarToTitle ?? rec.matchedFavorites[0]) && (
          <p className="text-ns-muted text-[10px] font-body leading-tight line-clamp-2 mb-1.5">
            <span className="text-ns-muted/50">Like </span>
            <span className="text-ns-muted">
              {rec.similarToTitle ?? rec.matchedFavorites.slice(0, 2).join(' & ')}
            </span>
          </p>
        )}

        {/* Trait pills */}
        {rec.matchedTraits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {rec.matchedTraits.slice(0, 3).map(t => (
              <span key={t.trait}
                className="px-1.5 py-0.5 rounded-md bg-ns-surface border border-ns-border
                           text-ns-muted/70 text-[9px] font-body flex items-center gap-0.5">
                <span className="text-[8px]">{t.icon}</span>
                {t.trait}
              </span>
            ))}
          </div>
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
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
                       border border-ns-border bg-ns-surface
                       text-ns-muted text-[10px] font-body
                       hover:border-ns-gold/40 hover:text-ns-gold
                       transition-all duration-150"
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
