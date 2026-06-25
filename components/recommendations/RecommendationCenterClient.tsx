'use client'

import { useState, useEffect, useTransition } from 'react'
import NextFavoriteHero from './NextFavoriteHero'
import CuratedRecCard   from './CuratedRecCard'
import RecPersonaSection from './RecPersonaSection'
import RecAccuracyWidget from './RecAccuracyWidget'
import BasedOnRatingsSection from './BasedOnRatingsSection'
import FriendRecs from '@/components/friends/FriendRecs'
import type { CuratedRecGroups, EnrichedRec } from '@/services/curated-recs'
import type { RecPersona } from '@/types'
import {
  RecsIcon, FilmIcon, MovieDnaIcon, TrendingIcon, CalendarIcon,
  type IconProps,
} from '@/components/icons'

// ─── Section config ───────────────────────────────────────────────────────────

interface SectionConfig {
  key:     keyof Omit<CuratedRecGroups, 'nextFavorite' | 'topTraits'>
  title:   string
  Icon:    React.ComponentType<IconProps>
  tagline: string
  empty:   string
}

const SECTIONS: SectionConfig[] = [
  {
    key:     'weThinkYoudLike',
    title:   "We Think You'll Like",
    Icon:    RecsIcon,
    tagline: 'Your highest-confidence personalised picks',
    empty:   'Add more favorite films to unlock personalised picks.',
  },
  {
    key:     'similarToFavorites',
    title:   'Similar To Your Favorites',
    Icon:    FilmIcon,
    tagline: 'Films tied directly to movies you already love',
    empty:   'Complete your taste profile to see films like your favorites.',
  },
  {
    key:     'dnaBasedPicks',
    title:   'Based On Your DNA',
    Icon:    MovieDnaIcon,
    tagline: 'Matched to your top cinematic taste dimensions',
    empty:   'Build your taste profile to unlock DNA-based picks.',
  },
  {
    key:     'expandYourTaste',
    title:   'Expand Your Taste',
    Icon:    TrendingIcon,
    tagline: 'Step outside your comfort zone — you might love these',
    empty:   'Rate more films to discover where your taste can grow.',
  },
  {
    key:     'rediscoverClassics',
    title:   'Rediscover Classics',
    Icon:    CalendarIcon,
    tagline: 'Pre-1990 masterpieces that match your DNA',
    empty:   'No classics match your current DNA profile.',
  },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="rounded-3xl border border-ns-border bg-ns-surface animate-pulse" style={{ minHeight: 220 }}>
      <div className="h-full p-8 flex gap-6">
        <div className="w-40 aspect-[2/3] bg-ns-border rounded-xl" />
        <div className="flex-1 space-y-3 py-2">
          <div className="h-2 bg-ns-border rounded w-32" />
          <div className="h-6 bg-ns-border rounded w-2/3" />
          <div className="h-3 bg-ns-border rounded w-full" />
          <div className="h-3 bg-ns-border rounded w-4/5" />
        </div>
      </div>
    </div>
  )
}

function ShelfSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[140px] flex-shrink-0 animate-pulse">
          <div className="w-[140px] h-[210px] rounded-xl bg-ns-border mb-2" />
          <div className="h-3 bg-ns-border rounded w-4/5 mb-1" />
          <div className="h-2 bg-ns-border rounded w-2/5" />
        </div>
      ))}
    </div>
  )
}

// ─── Section shelf ────────────────────────────────────────────────────────────

interface ShelfProps {
  items:   EnrichedRec[]
  section: SectionConfig
  topTraits: CuratedRecGroups['topTraits']
}

function SectionShelf({ items, section, topTraits }: ShelfProps) {
  const showTraits = section.key === 'dnaBasedPicks' && topTraits.length > 0

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-ns-border">
        <div className="flex items-center gap-2 mb-0.5">
          <section.Icon size={16} className="text-ns-gold flex-shrink-0" />
          <h2 className="text-sm font-heading text-white">{section.title}</h2>
        </div>
        <p className="text-[11px] font-body text-ns-muted">{section.tagline}</p>

        {/* DNA top traits pills */}
        {showTraits && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {topTraits.map(t => (
              <span
                key={t.label}
                className="text-[9px] font-body text-ns-gold bg-ns-gold/10 border border-ns-gold/20 px-2 py-0.5 rounded-full"
              >
                {t.label} {t.score.toFixed(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shelf */}
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-ns-muted font-body text-sm">{section.empty}</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide">
          {items.map(rec => (
            <div key={rec.tmdbId} className="flex-shrink-0">
              <CuratedRecCard rec={rec} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function RecommendationCenterClient() {
  const [groups,   setGroups]   = useState<CuratedRecGroups | null>(null)
  const [personas, setPersonas] = useState<RecPersona[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [perLoading, setPerLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Fetch curated recs
    fetch('/api/curated-recs')
      .then(r => r.json())
      .then(data => setGroups(data))
      .catch(() => {})
      .finally(() => setRecLoading(false))

    // Fetch personas (can be slow — non-blocking)
    startTransition(() => {
      fetch('/api/recommendations/personas')
        .then(r => r.json())
        .then(data => setPersonas(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setPerLoading(false))
    })
  }, [])

  async function handleFeedback(tmdbId: number, feedbackType: string) {
    // Submit feedback (fire-and-forget for hero card)
    try {
      await fetch('/api/recommendations/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tmdbId, feedback: feedbackType }),
      })
    } catch {
      // Non-fatal
    }
  }

  const totalPicks = groups
    ? groups.weThinkYoudLike.length + groups.similarToFavorites.length +
      groups.dnaBasedPicks.length + groups.expandYourTaste.length + groups.rediscoverClassics.length
    : 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-white mb-2">
            Recommendation Center
          </h1>
          <p className="text-ns-muted font-body text-sm">
            {recLoading
              ? 'Loading your personalised picks…'
              : `${totalPicks} personalised recommendations powered by your Movie DNA`
            }
          </p>
        </div>
        <RecAccuracyWidget />
      </div>

      {/* ─── 🎯 NEXT FAVORITE hero ─────────────────────────────────────────── */}
      {recLoading ? (
        <HeroSkeleton />
      ) : groups?.nextFavorite ? (
        <NextFavoriteHero
          rec={groups.nextFavorite}
          onFeedback={handleFeedback}
        />
      ) : null}

      {/* ─── ⭐ Based On Your Ratings ────────────────────────────────────────── */}
      <BasedOnRatingsSection />

      {/* ─── 🤝 Because Your Friends Loved It ───────────────────────────────── */}
      <FriendRecs />

      {/* ─── 5 rec sections ────────────────────────────────────────────────── */}
      {recLoading ? (
        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.key} className="bg-ns-surface border border-ns-border rounded-2xl p-5">
              <div className="h-3 bg-ns-border rounded w-40 mb-4 animate-pulse" />
              <ShelfSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(s => (
            <SectionShelf
              key={s.key}
              section={s}
              items={(groups?.[s.key] ?? []) as EnrichedRec[]}
              topTraits={groups?.topTraits ?? []}
            />
          ))}
        </div>
      )}

      {/* ─── Personas ──────────────────────────────────────────────────────── */}
      {perLoading ? (
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 animate-pulse">
          <div className="h-3 bg-ns-border rounded w-48 mb-4" />
          <ShelfSkeleton />
        </div>
      ) : (
        <RecPersonaSection personas={personas} />
      )}
    </div>
  )
}
