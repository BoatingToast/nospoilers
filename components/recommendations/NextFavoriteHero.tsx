'use client'

import Image from 'next/image'
import { useState } from 'react'
import { tmdbImageUrl } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import RecBreakdownModal from './RecBreakdownModal'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import {
  FilmIcon,
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

export default function NextFavoriteHero({ rec, onFeedback }: Props) {
  const [showWhy, setShowWhy] = useState(false)
  const [sent,    setSent]    = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saveError, setSaveError] = useState(false)

  const img = tmdbImageUrl(rec.posterPath, 'w342')

  async function handleFeedback(type: string) {
    setSaving(true)
    setSaveError(false)
    const saved = onFeedback ? await onFeedback(rec, type) : true
    setSaving(false)
    if (saved) setSent(type)
    else setSaveError(true)
  }

  const ACTIONS = [
    { label: 'Great pick',       value: 'liked',           Icon: ThumbUpIcon },
    { label: 'Watchlist',        value: 'watchlist',       Icon: WatchlistIcon },
    { label: 'Already Seen',     value: 'watched',         Icon: EyeIcon },
    { label: 'Not Interested',   value: 'not_interested',  Icon: ThumbDownIcon },
  ]

  return (
    <>
      <Section
        title="Your Next Favorite"
        action={<Badge variant="secondary" size="md">{rec.matchScore}% match</Badge>}
      >
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row">
          {/* Poster */}
          <div className="relative aspect-[2/3] w-40 flex-shrink-0 self-start overflow-hidden rounded border border-ns-border sm:w-44">
            {img ? (
              <Image
                src={img}
                alt={rec.title}
                fill
                className="object-cover"
                sizes="176px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-ns-surface-2">
                <FilmIcon size={48} className="text-ns-muted/30" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="font-heading text-2xl leading-tight text-ns-text sm:text-3xl">
              {rec.title}
            </h3>

            {rec.releaseDate && (
              <p className="mt-1 font-body text-xs text-ns-muted">
                {rec.releaseDate.slice(0, 4)}
              </p>
            )}

            <p className="mt-3 font-body text-sm leading-relaxed text-ns-text">
              {rec.explanation}
            </p>

            {/* Matched ratings and favorites, as ruled rows */}
            {(rec.matchedRatings.length > 0 || rec.matchedFavorites.length > 0) && (
              <ul className="mt-4 border-b border-ns-border">
                {rec.matchedRatings.map(rating => (
                  <li
                    key={`${rating.title}-${rating.score}`}
                    className="border-t border-ns-border py-2 font-body text-xs text-ns-muted"
                  >
                    You rated <span className="text-ns-text">{rating.title}</span>{' '}
                    <span className="text-ns-secondary-readable">{rating.score}/100</span>
                  </li>
                ))}
                {rec.matchedFavorites.map(fav => (
                  <li key={fav} className="border-t border-ns-border py-2 font-body text-xs text-ns-muted">
                    Because you liked <span className="text-ns-text">{fav}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Actions */}
            <div className="mt-5 space-y-3">
              {sent ? (
                <p className="flex items-center gap-1.5 font-body text-sm text-ns-secondary-readable">
                  <CheckIcon size={14} /> Thanks for your feedback!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map(({ label, value, Icon }) => (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(value)}
                      disabled={saving}
                      className="min-h-10"
                    >
                      <Icon size={14} />
                      {label}
                    </Button>
                  ))}
                </div>
              )}

              {saveError && (
                <p className="font-body text-xs text-ns-danger">Couldn&apos;t save that yet. Please try again.</p>
              )}

              <button
                onClick={() => setShowWhy(true)}
                className="flex min-h-10 items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
              >
                Why this recommendation? <ArrowRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      </Section>

      {showWhy && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </>
  )
}
