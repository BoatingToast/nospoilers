'use client'

import { useState } from 'react'
import Link from 'next/link'
import CuratedRecCard from './CuratedRecCard'
import type { EnrichedRec, CuratedRecGroups } from '@/services/curated-recs'
import { useDashboardRecommendations } from './DashboardRecommendationsProvider'
import { ArrowRightIcon } from '@/components/icons'
import PosterRail from '@/components/discover/PosterRail'
import Button from '@/components/ui/Button'
import { MovieCardSkeleton } from '@/components/ui/Skeleton'

// ─── Tab config ────────────────────────────────────────────────────────────────

// Keys of CuratedRecGroups that are EnrichedRec[] (not nextFavorite / topTraits)
type RecArrayKey = 'weThinkYoudLike' | 'similarToFavorites' | 'dnaBasedPicks' | 'expandYourTaste' | 'rediscoverClassics'

interface TabConfig {
  key:      RecArrayKey
  label:    string
  eyebrow:  string
  emptyMsg: string
}

const TABS: TabConfig[] = [
  {
    key:      'weThinkYoudLike',
    label:    "We think you'd like",
    eyebrow:  'Personalised for you',
    emptyMsg: 'Add more favorite films to unlock personalised picks.',
  },
  {
    key:      'similarToFavorites',
    label:    'Similar to your favorites',
    eyebrow:  'Because you loved',
    emptyMsg: 'Complete your taste profile to see films like your favorites.',
  },
  {
    key:      'dnaBasedPicks',
    label:    'Based on your DNA',
    eyebrow:  'Matched to your cinematic DNA',
    emptyMsg: 'Build your taste profile to unlock DNA-based picks.',
  },
  {
    key:      'expandYourTaste',
    label:    'Expand your taste',
    eyebrow:  'Step outside your comfort zone',
    emptyMsg: 'Rate more films to discover where your taste can expand.',
  },
  {
    key:      'rediscoverClassics',
    label:    'Rediscover classics',
    eyebrow:  'Timeless cinema',
    emptyMsg: 'No classics match your current DNA profile.',
  },
]

function GroupShelf({ items, tab }: { items: EnrichedRec[]; tab: TabConfig }) {
  if (items.length === 0) {
    return <p className="rounded-xl bg-ns-surface-2 p-6 text-center text-sm text-ns-muted">{tab.emptyMsg}</p>
  }

  return (
    <PosterRail
      label={`${tab.label} picks`}
      controlsLabel={tab.label}
      bleed={false}
      heading={<p className="text-sm text-ns-muted">{tab.eyebrow}</p>}
    >
      {items.map(rec => (
        <CuratedRecCard key={rec.tmdbId} rec={rec} />
      ))}
    </PosterRail>
  )
}

export default function CuratedRecsWidget() {
  const { groups, loading, loadError, retry } = useDashboardRecommendations()
  const [activeTab, setActiveTab] = useState<RecArrayKey>('weThinkYoudLike')

  const currentTab    = TABS.find(t => t.key === activeTab)!
  const currentItems  = groups?.[activeTab] ?? []

  // Count non-empty groups for badge display
  const groupCounts = groups
    ? Object.fromEntries(TABS.map(t => [t.key, groups[t.key].length]))
    : {}

  return (
    <section aria-labelledby="curated-recs-title" className="rounded-3xl bg-ns-surface p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="curated-recs-title" className="font-display text-3xl text-ns-text sm:text-4xl">
            We think you&apos;d like
          </h2>
          <p className="mt-1.5 text-sm tabular-nums text-ns-muted">
            Powered by your Movie DNA · {loading ? '…' : totalRecs(groups)} personalised picks
          </p>
        </div>
        <Link
          href="/my-recommendations"
          className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2"
        >
          Full center <ArrowRightIcon size={14} />
        </Link>
      </div>

      <div role="group" aria-label="Recommendation groups" className="scrollbar-hide -mx-6 mb-5 flex gap-1 overflow-x-auto px-6 sm:-mx-8 sm:px-8">
        {TABS.map(tab => {
          const count    = groupCounts[tab.key] ?? 0
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
                isActive ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
              }`}
            >
              {tab.label}
              {!loading && count > 0 && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-ns-bg' : 'text-ns-subtle'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden" role="status" aria-label="Loading recommendations">
          {Array.from({ length: 5 }).map((_, i) => <MovieCardSkeleton key={i} />)}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-ns-surface-2 p-6 text-center">
          <p className="text-sm text-ns-muted">Could not load recommendations.</p>
          <Button variant="secondary" size="sm" onClick={retry} className="!bg-ns-surface-3 hover:!bg-ns-border">
            Try again
          </Button>
        </div>
      ) : (
        /* Opacity only: a transform here would trap the fixed dialogs in each card. */
        <div key={activeTab} className="animate-fade-in">
          <GroupShelf items={currentItems} tab={currentTab} />
        </div>
      )}
    </section>
  )
}

function totalRecs(groups: CuratedRecGroups | null): number {
  if (!groups) return 0
  return groups.weThinkYoudLike.length + groups.similarToFavorites.length +
         groups.dnaBasedPicks.length + groups.expandYourTaste.length + groups.rediscoverClassics.length
}
