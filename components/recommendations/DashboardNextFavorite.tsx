'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { CuratedRecGroups, EnrichedRec } from '@/services/curated-recs'
import RecBreakdownModal from './RecBreakdownModal'
import {
  RecsIcon, ThumbUpIcon, WatchlistIcon, EyeIcon, ThumbDownIcon,
  CheckIcon, ArrowRightIcon, type IconProps,
} from '@/components/icons'

export default function DashboardNextFavorite() {
  const [rec,     setRec]     = useState<EnrichedRec | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWhy, setShowWhy] = useState(false)
  const [sent,    setSent]    = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    fetch('/api/curated-recs')
      .then(r => r.json())
      .then((data: CuratedRecGroups) => setRec(data.nextFavorite ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 animate-pulse h-40">
        <div className="h-3 bg-ns-border rounded w-32 mb-3" />
        <div className="h-5 bg-ns-border rounded w-2/3 mb-2" />
        <div className="h-3 bg-ns-border rounded w-full" />
      </div>
    )
  }

  if (!rec) {
    return (
      <div className="bg-ns-surface border border-dashed border-ns-border rounded-2xl p-5 flex flex-col items-center justify-center h-40 text-center">
        <p className="text-ns-muted font-body text-sm mb-2">
          Complete your taste profile to unlock your Next Favorite.
        </p>
        <Link href="/onboarding" className="text-ns-secondary text-xs font-body hover:text-amber-400">
          Set up profile <ArrowRightIcon size={11} className="inline-block" />
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
      <div className="bg-ns-surface border border-ns-secondary/30 rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-ns-secondary/5 to-transparent pointer-events-none" />

        <div className="flex gap-0">
          {/* Poster thumbnail */}
          {img && (
            <div className="relative w-24 flex-shrink-0">
              <Image
                src={img}
                alt={rec.title}
                width={96}
                height={144}
                className="object-cover h-full"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            <p className="text-[9px] font-body text-ns-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
              <RecsIcon size={10} /> Your Next Favorite
            </p>
            <div className="flex items-start gap-2 mb-1">
              <h3 className="text-sm font-heading text-white leading-tight truncate flex-1">
                {rec.title}
              </h3>
              <span className="text-[10px] font-mono text-ns-secondary bg-ns-secondary/10 border border-ns-secondary/20 px-1.5 py-0.5 rounded-md flex-shrink-0">
                {rec.matchScore}%
              </span>
            </div>
            <p className="text-[11px] font-body text-ns-muted line-clamp-2 mb-3">
              {rec.explanation}
            </p>

            {/* Quick actions */}
            {sent ? (
              <p className="text-xs font-body text-ns-secondary flex items-center gap-1">
                <CheckIcon size={12} /> Feedback saved
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {ACTIONS.map(({ Icon, value, title }) => (
                  <button
                    key={value}
                    title={title}
                    onClick={() => handleFeedback(value)}
                    disabled={saving}
                    className="text-ns-muted hover:text-white hover:scale-110 transition-all"
                  >
                    <Icon size={16} />
                  </button>
                ))}
                <button
                  onClick={() => setShowWhy(true)}
                  className="ml-auto text-[10px] font-body text-ns-secondary hover:text-amber-400 transition-colors flex items-center gap-0.5"
                >
                  Why? <ArrowRightIcon size={10} />
                </button>
              </div>
            )}
            {saveError && (
              <p className="mt-1 text-[10px] font-body text-red-400">Couldn&apos;t save. Try again.</p>
            )}
          </div>
        </div>

        {/* Footer link */}
        <div className="border-t border-ns-border px-4 py-2 flex justify-between items-center">
          <Link
            href={`/movie/${rec.tmdbId}`}
            className="text-[10px] font-body text-ns-muted hover:text-ns-text transition-colors"
          >
            View movie <ArrowRightIcon size={10} className="inline-block" />
          </Link>
          <Link
            href="/my-recommendations"
            className="text-[10px] font-body text-ns-secondary hover:text-amber-400 transition-colors"
          >
            All recommendations <ArrowRightIcon size={10} className="inline-block" />
          </Link>
        </div>
      </div>

      {showWhy && rec && (
        <RecBreakdownModal rec={rec} onClose={() => setShowWhy(false)} />
      )}
    </>
  )
}
