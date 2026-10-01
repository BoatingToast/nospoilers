'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { EnrichedRec } from '@/services/curated-recs'
import RecBreakdownModal from './RecBreakdownModal'
import { useDashboardRecommendations } from './DashboardRecommendationsProvider'
import {
  ThumbUpIcon, WatchlistIcon, EyeIcon, ThumbDownIcon,
  CheckIcon, ArrowRightIcon, type IconProps,
} from '@/components/icons'

export default function DashboardNextFavorite() {
  const { groups, loading, loadError, retry } = useDashboardRecommendations()
  const [showWhy, setShowWhy] = useState(false)
  const [sent,    setSent]    = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saveError, setSaveError] = useState(false)
  const rec: EnrichedRec | null = groups?.nextFavorite ?? null

  async function handleFeedback(type: string) {
    if (!rec) return
    setSaving(true)
    setSaveError(false)
    try {
      const response = await fetch('/api/recommendations/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation: rec, feedback: type }),
      })
      if (!response.ok) throw new Error('Feedback request failed')
      setSent(type)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-40 animate-pulse border-t border-ns-border pt-4">
        <div className="mb-3 h-3 w-32 rounded bg-ns-surface-2" />
        <div className="mb-2 h-5 w-2/3 rounded bg-ns-surface-2" />
        <div className="h-3 w-full rounded bg-ns-surface-2" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="border-t border-ns-border pt-4">
        <p className="mb-2 font-body text-sm text-ns-muted">
          Could not load your Next Favorite.
        </p>
        <button
          type="button"
          onClick={retry}
          className="min-h-10 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!rec) {
    return (
      <div className="border-t border-ns-border pt-4">
        <p className="mb-2 font-body text-sm text-ns-muted">
          Complete your taste profile to unlock your Next Favorite.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-10 items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
        >
          Set up profile <ArrowRightIcon size={12} className="inline-block" />
        </Link>
      </div>
    )
  }

  const img = tmdbImageUrl(rec.posterPath, 'w185')

  const ACTIONS: { Icon: React.ComponentType<IconProps>; value: string; title: string }[] = [
    { Icon: ThumbUpIcon,   value: 'liked',         title: 'Great pick!'      },
    { Icon: WatchlistIcon, value: 'watchlist',      title: 'Add to watchlist' },
    { Icon: EyeIcon,       value: 'watched',        title: 'Already seen'     },
    { Icon: ThumbDownIcon, value: 'not_interested', title: 'Not interested'   },
  ]

  return (
    <>
      <div className="min-w-0 border-t border-ns-border pt-4">
        <div className="flex min-w-0 gap-4">
          {/* Poster thumbnail */}
          {img && (
            <div className="relative w-24 flex-shrink-0 self-start overflow-hidden rounded border border-ns-border">
              <Image
                src={img}
                alt={rec.title}
                width={96}
                height={144}
                className="h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold leading-tight text-ns-text">
              {rec.title}
            </h3>
            <p className="mt-1 font-body text-xs text-ns-muted">
              Your Next Favorite · <span className="font-semibold text-ns-secondary-readable">{rec.matchScore}%</span>
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-ns-muted line-clamp-3">
              {rec.explanation}
            </p>

            {/* Quick actions */}
            {sent ? (
              <p className="mt-3 flex items-center gap-1 font-body text-xs text-ns-secondary-readable">
                <CheckIcon size={12} /> Feedback saved
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {ACTIONS.map(({ Icon, value, title }) => (
                  <button
                    key={value}
                    title={title}
                    onClick={() => handleFeedback(value)}
                    disabled={saving}
                    className="-ml-2 flex h-10 w-10 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
                  >
                    <Icon size={16} />
                  </button>
                ))}
                <button
                  onClick={() => setShowWhy(true)}
                  className="ml-auto flex min-h-10 items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
                >
                  Why? <ArrowRightIcon size={12} />
                </button>
              </div>
            )}
            {saveError && (
              <p className="mt-1 font-body text-[11px] text-ns-danger">Couldn&apos;t save. Try again.</p>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-ns-border pt-3">
          <Link
            href={`/movie/${rec.tmdbId}`}
            className="inline-flex min-h-10 items-center gap-1 font-heading text-sm text-ns-text underline underline-offset-4 hover:text-ns-secondary-readable"
          >
            View movie <ArrowRightIcon size={12} className="inline-block" />
          </Link>
          <Link
            href="/my-recommendations"
            className="inline-flex min-h-10 items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
          >
            All recommendations <ArrowRightIcon size={12} className="inline-block" />
          </Link>
        </div>
      </div>

      {showWhy && rec && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </>
  )
}
