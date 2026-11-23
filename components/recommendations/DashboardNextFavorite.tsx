'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EnrichedRec } from '@/services/curated-recs'
import PosterImage from '@/components/discover/PosterImage'
import GrowBar from '@/components/movie/GrowBar'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
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
      <div className="flex gap-4 rounded-2xl bg-ns-surface p-4" role="status" aria-label="Loading your Next Favorite">
        <Skeleton className="aspect-[2/3] w-24 flex-shrink-0 rounded-xl !bg-ns-surface-2" />
        <div className="flex-1 space-y-2.5 py-1">
          <Skeleton className="h-4 w-32 !bg-ns-surface-2" />
          <Skeleton className="h-6 w-2/3 !bg-ns-surface-2" />
          <Skeleton className="h-4 w-full !bg-ns-surface-2" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-ns-surface p-6">
        <p className="text-base text-ns-muted">Could not load your Next Favorite.</p>
        <Button variant="secondary" size="sm" onClick={retry} className="!bg-ns-surface-2 hover:!bg-ns-surface-3">
          Try again
        </Button>
      </div>
    )
  }

  if (!rec) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-ns-surface p-6">
        <p className="text-base text-ns-muted">Complete your taste profile to unlock your Next Favorite.</p>
        <Button variant="secondary" size="sm" href="/onboarding" className="!bg-ns-surface-2 hover:!bg-ns-surface-3">
          Set up profile <ArrowRightIcon size={14} />
        </Button>
      </div>
    )
  }

  const ACTIONS: { Icon: React.ComponentType<IconProps>; value: string; title: string }[] = [
    { Icon: ThumbUpIcon, value: 'liked', title: 'Great pick!'      },
    { Icon: WatchlistIcon, value: 'watchlist', title: 'Add to watchlist' },
    { Icon: EyeIcon, value: 'watched', title: 'Already seen'     },
    { Icon: ThumbDownIcon, value: 'not_interested', title: 'Not interested'   },
  ]

  return (
    <div>
      <section aria-labelledby="dashboard-next-favorite" className="rounded-2xl bg-ns-surface p-4 sm:p-5">
        <div className="flex gap-4">
          <Link
            href={`/movie/${rec.tmdbId}`}
            aria-label={`View ${rec.title}`}
            className="group relative block aspect-[2/3] w-24 flex-shrink-0 self-start overflow-hidden rounded-xl bg-ns-surface-2 sm:w-28"
          >
            <PosterImage
              path={rec.posterPath}
              size="w185"
              sizes="112px"
              className="transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ns-secondary-readable">Your next favorite</p>
            <h3 id="dashboard-next-favorite" className="mt-0.5 line-clamp-2 font-heading text-xl font-bold leading-tight text-ns-text">
              {rec.title}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <GrowBar value={rec.matchScore / 100} className="flex-1" />
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-ns-text">{rec.matchScore}%</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-snug text-ns-muted">{rec.explanation}</p>
          </div>
        </div>

        {sent ? (
          <p className="mt-3 flex min-h-11 animate-fade-up items-center gap-2 text-sm font-medium text-ns-success">
            <CheckIcon size={16} /> Feedback saved
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-1">
            {ACTIONS.map(({ Icon, value, title }) => (
              <button
                key={value}
                type="button"
                title={title}
                aria-label={title}
                onClick={() => handleFeedback(value)}
                disabled={saving}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text disabled:cursor-not-allowed disabled:text-ns-subtle"
              >
                <Icon size={18} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowWhy(true)}
              aria-haspopup="dialog"
              className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2"
            >
              Why? <ArrowRightIcon size={13} />
            </button>
          </div>
        )}
        {saveError && (
          <p role="alert" className="mt-1 text-sm text-ns-danger">Couldn&apos;t save. Try again.</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-ns-border pt-1">
          <Link
            href={`/movie/${rec.tmdbId}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ns-muted transition-colors hover:text-ns-text"
          >
            View movie <ArrowRightIcon size={13} />
          </Link>
          <Link
            href="/my-recommendations"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ns-muted transition-colors hover:text-ns-text"
          >
            All recommendations <ArrowRightIcon size={13} />
          </Link>
        </div>
      </section>

      {showWhy && rec && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </div>
  )
}
