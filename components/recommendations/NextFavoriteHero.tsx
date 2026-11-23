'use client'

import { useState } from 'react'
import type { EnrichedRec } from '@/services/curated-recs'
import PosterImage from '@/components/discover/PosterImage'
import GrowBar from '@/components/movie/GrowBar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import RecBreakdownModal from './RecBreakdownModal'
import {
  ThumbUpIcon,
  WatchlistIcon,
  EyeIcon,
  ThumbDownIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@/components/icons'

interface Props {
  rec: EnrichedRec
  onFeedback?: (recommendation: EnrichedRec, feedback: string) => Promise<boolean>
}

const ACTIONS = [
  { label: 'Great pick', value: 'liked', Icon: ThumbUpIcon },
  { label: 'Watchlist', value: 'watchlist', Icon: WatchlistIcon },
  { label: 'Already seen', value: 'watched', Icon: EyeIcon },
  { label: 'Not interested', value: 'not_interested', Icon: ThumbDownIcon },
]

export default function NextFavoriteHero({ rec, onFeedback }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const [sent,    setSent]    = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saveError, setSaveError] = useState(false)

  async function handleFeedback(type: string) {
    setSaving(true)
    setSaveError(false)
    const saved = onFeedback ? await onFeedback(rec, type) : true
    setSaving(false)
    if (saved) setSent(type)
    else setSaveError(true)
  }

  return (
    <div>
      <section aria-labelledby="next-favorite-title" className="rounded-3xl bg-ns-surface p-6 sm:p-10">
        <div className="grid gap-7 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-xl bg-ns-surface-2 shadow-2xl sm:w-full">
            <PosterImage path={rec.posterPath} sizes="(min-width: 1024px) 256px, 208px" alt={rec.title} />
          </div>

          <div className="flex min-w-0 flex-col">
            <p className="text-base font-semibold text-ns-secondary-readable">Your next favorite</p>
            <h2 id="next-favorite-title" className="mt-2 break-words font-display text-4xl text-ns-text sm:text-5xl">
              {rec.title}
            </h2>
            {rec.releaseDate && (
              <p className="mt-2 text-base tabular-nums text-ns-muted">{rec.releaseDate.slice(0, 4)}</p>
            )}

            <div className="mt-4 flex max-w-sm items-center gap-3">
              <GrowBar value={rec.matchScore / 100} className="flex-1" />
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-ns-text">{rec.matchScore}% match</span>
            </div>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ns-text">{rec.explanation}</p>

            {(rec.matchedRatings.length > 0 || rec.matchedFavorites.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {rec.matchedRatings.map(rating => (
                  <Badge key={`${rating.title}-${rating.score}`} size="md" className="max-w-full !whitespace-normal font-medium">
                    You rated {rating.title} {rating.score}/100
                  </Badge>
                ))}
                {rec.matchedFavorites.map(fav => (
                  <Badge key={fav} size="md" className="max-w-full !whitespace-normal font-medium">
                    Because you liked {fav}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-auto sm:pt-6">
              <Button href={`/movie/${rec.tmdbId}`}>View film</Button>
              <button
                type="button"
                onClick={() => setShowWhy(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2"
              >
                Why this recommendation? <ArrowRightIcon size={14} />
              </button>
            </div>

            <div className="mt-4 border-t border-ns-border pt-4">
              {sent ? (
                <p className="flex animate-fade-up items-center gap-2 text-sm font-medium text-ns-success">
                  <CheckIcon size={16} /> Thanks for your feedback!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map(({ label, value, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleFeedback(value)}
                      disabled={saving}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ns-surface-2 px-3.5 text-sm font-medium text-ns-text transition-colors duration-150 hover:bg-ns-surface-3 disabled:cursor-not-allowed disabled:text-ns-subtle"
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {saveError && (
                <p role="alert" className="mt-2 text-sm text-ns-danger">Couldn&apos;t save that yet. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {showWhy && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </div>
  )
}
