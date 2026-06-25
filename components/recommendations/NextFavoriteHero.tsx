'use client'

import Image from 'next/image'
import { useState } from 'react'
import { tmdbImageUrl } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import RecBreakdownModal from './RecBreakdownModal'
import {
  FilmIcon,
  RecsIcon,
  ThumbUpIcon,
  WatchlistIcon,
  EyeIcon,
  ThumbDownIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@/components/icons'

interface Props {
  rec: EnrichedRec
  onFeedback?: (tmdbId: number, feedback: string) => void
}

export default function NextFavoriteHero({ rec, onFeedback }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const [sent,    setSent]    = useState<string | null>(null)

  const img = tmdbImageUrl(rec.posterPath, 'w342')

  function handleFeedback(type: string) {
    setSent(type)
    onFeedback?.(rec.tmdbId, type)
  }

  const ACTIONS = [
    { label: 'Great pick',       value: 'liked',           Icon: ThumbUpIcon,   color: 'bg-emerald-700/70 hover:bg-emerald-600' },
    { label: 'Watchlist',        value: 'watchlist',       Icon: WatchlistIcon, color: 'bg-red-800/70 hover:bg-red-700' },
    { label: 'Already Seen',     value: 'watched',         Icon: EyeIcon,       color: 'bg-ns-surface hover:bg-white/10' },
    { label: 'Not Interested',   value: 'not_interested',  Icon: ThumbDownIcon, color: 'bg-ns-surface hover:bg-white/10' },
  ]

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-ns-gold/40 bg-ns-surface">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-ns-gold/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row gap-0">
          {/* Poster */}
          <div className="relative sm:w-52 flex-shrink-0">
            <div className="aspect-[2/3] sm:aspect-auto sm:h-full relative">
              {img ? (
                <Image
                  src={img}
                  alt={rec.title}
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 100vw, 208px"
                />
              ) : (
                <div className="absolute inset-0 bg-ns-border flex items-center justify-center">
                  <FilmIcon size={48} className="text-ns-muted/30" />
                </div>
              )}
              {/* Gradient overlay on mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-ns-surface via-transparent to-transparent sm:hidden" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between min-h-0">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-body text-ns-gold uppercase tracking-widest flex items-center gap-1.5">
                  <RecsIcon size={12} /> Your Next Favorite
                </span>
                <div className="flex-1 h-px bg-ns-gold/20" />
                <span className="text-xs font-mono font-bold text-ns-gold bg-ns-gold/10 px-2 py-0.5 rounded-full border border-ns-gold/30">
                  {rec.matchScore}% match
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 leading-tight">
                {rec.title}
              </h2>

              {rec.releaseDate && (
                <p className="text-ns-muted font-body text-xs mb-3">
                  {rec.releaseDate.slice(0, 4)}
                </p>
              )}

              <p className="text-ns-text font-body text-sm leading-relaxed mb-4">
                {rec.explanation}
              </p>

              {/* Matched favorites */}
              {rec.matchedFavorites.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {rec.matchedFavorites.map(fav => (
                    <span
                      key={fav}
                      className="text-[10px] font-body text-ns-muted bg-white/5 border border-ns-border rounded-full px-2.5 py-0.5"
                    >
                      Because you liked <span className="text-ns-text">{fav}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {sent ? (
                <p className="text-sm font-body text-ns-gold flex items-center gap-1.5">
                  <CheckIcon size={14} /> Thanks for your feedback!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map(({ label, value, Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => handleFeedback(value)}
                      className={`${color} text-white text-xs font-body px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowWhy(true)}
                className="text-xs font-body text-ns-gold hover:text-amber-400 transition-colors underline underline-offset-2 flex items-center gap-1"
              >
                Why this recommendation? <ArrowRightIcon size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showWhy && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </>
  )
}
