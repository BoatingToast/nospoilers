'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CuratedRecCard from './CuratedRecCard'
import type { EnrichedRec, CuratedRecGroups } from '@/services/curated-recs'
import {
  RecsIcon, FilmIcon, MovieDnaIcon, TrendingIcon, CalendarIcon, ArrowRightIcon,
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
          <div className="w-[170px] h-[255px] rounded-xl bg-ns-border mb-3" />
          <div className="h-3 bg-ns-border rounded w-4/5 mb-1.5" />
          <div className="h-2.5 bg-ns-border rounded w-2/5" />
        </div>
      ))}
    </div>
  )
}

// ─── Group shelf ──────────────────────────────────────────────────────────────

function GroupShelf({ items, tab }: { items: EnrichedRec[]; tab: TabConfig }) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-ns-border rounded-xl p-8 text-center">
        <p className="text-ns-muted font-body text-sm">{tab.emptyMsg}</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3 -mx-6 px-6 scrollbar-hide">
      {items.map(rec => (
        <CuratedRecCard key={rec.tmdbId} rec={rec} />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CuratedRecsWidget() {
  const [groups,  setGroups]  = useState<CuratedRecGroups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [activeTab, setActiveTab] = useState<RecArrayKey>('weThinkYoudLike')

  useEffect(() => {
    fetch('/api/curated-recs')
      .then(r => r.json())
      .then(data => setGroups(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const currentTab    = TABS.find(t => t.key === activeTab)!
  const currentItems  = groups?.[activeTab] ?? []

  // Count non-empty groups for badge display
  const groupCounts = groups
    ? Object.fromEntries(TABS.map(t => [t.key, groups[t.key].length]))
    : {}

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      {/* Widget header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-ns-gold text-[10px] tracking-widest uppercase font-body mb-1 flex items-center gap-1.5">
            <RecsIcon size={11} /> Curated For You
          </p>
          <h2 className="font-display text-2xl tracking-wider text-ns-text">
            WE THINK YOU'D LIKE
          </h2>
          <p className="text-ns-muted text-[11px] font-body mt-0.5">
            Powered by your Movie DNA · {loading ? '…' : totalRecs(groups)} personalised picks
          </p>
        </div>
        <Link href="/my-recommendations"
          className="text-ns-gold text-xs font-body hover:text-amber-400 transition-colors flex-shrink-0">
          Full center <ArrowRightIcon size={11} className="inline-block" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto -mx-6 px-6 mb-5 scrollbar-hide">
        <div className="flex gap-1 border-b border-ns-border w-full pb-0">
          {TABS.map(tab => {
            const count   = groupCounts[tab.key] ?? 0
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as RecArrayKey)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-body whitespace-nowrap
                            border-b-2 -mb-px transition-all duration-150 flex-shrink-0
                            ${isActive
                              ? 'border-ns-gold text-ns-gold'
                              : 'border-transparent text-ns-muted hover:text-ns-text'
                            }`}
              >
                <tab.Icon size={14} className="flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
                {!loading && count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-body
                                    ${isActive ? 'bg-ns-gold/20 text-ns-gold' : 'bg-ns-border text-ns-muted/60'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab eyebrow */}
      {!loading && currentItems.length > 0 && (
        <p className="text-ns-muted/60 text-[10px] tracking-widest uppercase font-body mb-4">
          {currentTab.eyebrow}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="border border-dashed border-ns-border rounded-xl p-8 text-center">
          <p className="text-ns-muted font-body text-sm">
            Could not load recommendations.{' '}
            <button onClick={() => window.location.reload()}
              className="text-ns-gold hover:text-amber-400 transition-colors">
              Try again
            </button>
          </p>
        </div>
      ) : (
        <GroupShelf items={currentItems} tab={currentTab} />
      )}
    </div>
  )
}

function totalRecs(groups: CuratedRecGroups | null): number {
  if (!groups) return 0
  return groups.weThinkYoudLike.length + groups.similarToFavorites.length +
         groups.dnaBasedPicks.length + groups.expandYourTaste.length + groups.rediscoverClassics.length
}
