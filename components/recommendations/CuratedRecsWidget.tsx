'use client'

import { useState } from 'react'
import Section from '@/components/ui/Section'
import CuratedRecCard from './CuratedRecCard'
import type { EnrichedRec, CuratedRecGroups } from '@/services/curated-recs'
import { useDashboardRecommendations } from './DashboardRecommendationsProvider'
import {
  RecsIcon, FilmIcon, MovieDnaIcon, TrendingIcon, CalendarIcon,
  type IconProps,
} from '@/components/icons'

// ─── Tab config ────────────────────────────────────────────────────────────────

// Keys of CuratedRecGroups that are EnrichedRec[] (not nextFavorite / topTraits)
type RecArrayKey = 'weThinkYoudLike' | 'similarToFavorites' | 'dnaBasedPicks' | 'expandYourTaste' | 'rediscoverClassics'

interface TabConfig {
  key:      RecArrayKey
  label:    string
  eyebrow:  string
  Icon:     React.ComponentType<IconProps>
  emptyMsg: string
}

const TABS: TabConfig[] = [
  {
    key:      'weThinkYoudLike',
    label:    "We Think You'd Like",
    eyebrow:  'Personalised for you',
    Icon:     RecsIcon,
    emptyMsg: 'Add more favorite films to unlock personalised picks.',
  },
  {
    key:      'similarToFavorites',
    label:    'Similar To Your Favorites',
    eyebrow:  'Because you loved',
    Icon:     FilmIcon,
    emptyMsg: 'Complete your taste profile to see films like your favorites.',
  },
  {
    key:      'dnaBasedPicks',
    label:    'Based On Your DNA',
    eyebrow:  'Matched to your cinematic DNA',
    Icon:     MovieDnaIcon,
    emptyMsg: 'Build your taste profile to unlock DNA-based picks.',
  },
  {
    key:      'expandYourTaste',
    label:    'Expand Your Taste',
    eyebrow:  'Step outside your comfort zone',
    Icon:     TrendingIcon,
    emptyMsg: 'Rate more films to discover where your taste can expand.',
  },
  {
    key:      'rediscoverClassics',
    label:    'Rediscover Classics',
    eyebrow:  'Timeless cinema',
    Icon:     CalendarIcon,
    emptyMsg: 'No classics match your current DNA profile.',
  },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[170px] flex-shrink-0 animate-pulse">
          <div className="mb-3 h-[255px] w-[170px] rounded bg-ns-surface-2" />
          <div className="mb-1.5 h-3 w-4/5 rounded bg-ns-surface-2" />
          <div className="h-2.5 w-2/5 rounded bg-ns-surface-2" />
        </div>
      ))}
    </div>
  )
}

// ─── Group shelf ──────────────────────────────────────────────────────────────

function GroupShelf({ items, tab }: { items: EnrichedRec[]; tab: TabConfig }) {
  if (items.length === 0) {
    return (
      <p className="py-6 font-body text-sm text-ns-muted">{tab.emptyMsg}</p>
    )
  }

  return (
    <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-3">
      {items.map(rec => (
        <CuratedRecCard key={rec.tmdbId} rec={rec} />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    <Section
      title="WE THINK YOU'D LIKE"
      note={<>Powered by your Movie DNA · {loading ? '…' : totalRecs(groups)} personalised picks</>}
      href="/my-recommendations"
      linkLabel="Full center"
    >
      {/* Tabs */}
      <div className="scrollbar-hide mb-5 flex overflow-x-auto border-b border-ns-border">
        {TABS.map(tab => {
          const count   = groupCounts[tab.key] ?? 0
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as RecArrayKey)}
              className={`-mb-px flex min-h-10 flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 pr-5 font-heading text-sm transition-colors
                          ${isActive
                            ? 'border-ns-text text-ns-text'
                            : 'border-transparent text-ns-muted hover:text-ns-text'
                          }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
              {!loading && count > 0 && (
                <span className={`text-xs ${isActive ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* What this shelf is */}
      {!loading && currentItems.length > 0 && (
        <p className="mb-4 font-body text-sm text-ns-muted">
          {currentTab.eyebrow}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : loadError ? (
        <p className="py-6 font-body text-sm text-ns-muted">
          Could not load recommendations.{' '}
          <button onClick={retry}
            className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
            Try again
          </button>
        </p>
      ) : (
        <GroupShelf items={currentItems} tab={currentTab} />
      )}
    </Section>
  )
}

function totalRecs(groups: CuratedRecGroups | null): number {
  if (!groups) return 0
  return groups.weThinkYoudLike.length + groups.similarToFavorites.length +
         groups.dnaBasedPicks.length + groups.expandYourTaste.length + groups.rediscoverClassics.length
}
