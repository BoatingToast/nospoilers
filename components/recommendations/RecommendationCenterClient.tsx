'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import NextFavoriteHero from './NextFavoriteHero'
import CuratedRecCard   from './CuratedRecCard'
import RecPersonaSection from './RecPersonaSection'
import RecAccuracyWidget from './RecAccuracyWidget'
import BasedOnRatingsSection from './BasedOnRatingsSection'
import MoodControls from './MoodControls'
import FriendRecs from '@/components/friends/FriendRecs'
import MovieDNACard from '@/components/dashboard/MovieDNACard'
import type { CuratedRecGroups, EnrichedRec } from '@/services/curated-recs'
import type { RecPersona, MovieDnaProfile, RecommendationMood } from '@/types'
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

const DEFAULT_RECOMMENDATION_MOOD: RecommendationMood = {
  intensity: 5,
  runtime: 5,
  adventure: 5,
}

type RecommendationState =
  | { status: 'loading' }
  | { status: 'success'; groups: CuratedRecGroups }
  | { status: 'error' }

const RECOMMENDATION_ARRAY_KEYS = [
  'weThinkYoudLike',
  'similarToFavorites',
  'dnaBasedPicks',
  'expandYourTaste',
  'rediscoverClassics',
] as const

function isCuratedRecGroups(value: unknown): value is CuratedRecGroups {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CuratedRecGroups>
  return RECOMMENDATION_ARRAY_KEYS.every(key => Array.isArray(candidate[key])) &&
    Array.isArray(candidate.topTraits) &&
    (candidate.nextFavorite === null || typeof candidate.nextFavorite === 'object')
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="flex animate-pulse gap-6 border-t-2 border-ns-text pt-4" style={{ minHeight: 220 }}>
      <div className="aspect-[2/3] w-28 rounded bg-ns-surface-2 sm:w-40" />
      <div className="flex-1 space-y-3 py-2">
        <div className="h-2 w-32 rounded bg-ns-surface-2" />
        <div className="h-6 w-2/3 rounded bg-ns-surface-2" />
        <div className="h-3 w-full rounded bg-ns-surface-2" />
        <div className="h-3 w-4/5 rounded bg-ns-surface-2" />
      </div>
    </div>
  )
}

function ShelfSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[140px] flex-shrink-0 animate-pulse">
          <div className="mb-2 h-[210px] w-[140px] rounded bg-ns-surface-2" />
          <div className="mb-1 h-3 w-4/5 rounded bg-ns-surface-2" />
          <div className="h-2 w-2/5 rounded bg-ns-surface-2" />
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
    <Section title={section.title} note={section.tagline}>
      {/* DNA top traits */}
      {showTraits && (
        <p className="-mt-2 mb-5 font-body text-sm text-ns-secondary-readable">
          {topTraits.map((t, index) => (
            <span key={t.label}>
              {index > 0 && <span className="text-ns-muted"> · </span>}
              {t.label} {t.score.toFixed(1)}
            </span>
          ))}
        </p>
      )}

      {/* Shelf */}
      {items.length === 0 ? (
        <p className="border-t border-ns-border py-6 font-body text-sm text-ns-muted">{section.empty}</p>
      ) : (
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
          {items.map(rec => (
            <div key={rec.tmdbId} className="flex-shrink-0">
              <CuratedRecCard rec={rec} />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function RecommendationCenterClient() {
  const { data: session } = useSession()
  const [personas, setPersonas] = useState<RecPersona[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationState>({ status: 'loading' })
  const [recRequest, setRecRequest] = useState(0)
  const [activeMood, setActiveMood] = useState<RecommendationMood>(DEFAULT_RECOMMENDATION_MOOD)
  const [perLoading, setPerLoading] = useState(true)
  const [, startTransition] = useTransition()

  const [dnaProfile, setDnaProfile] = useState<MovieDnaProfile | null>(null)
  const [dnaLoading, setDnaLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setRecommendations({ status: 'loading' })

    const query = new URLSearchParams({
      intensity: String(activeMood.intensity),
      runtime: String(activeMood.runtime),
      adventure: String(activeMood.adventure),
    })

    fetch(`/api/curated-recs?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Recommendation request failed')
        const data: unknown = await response.json()
        if (!isCuratedRecGroups(data)) throw new Error('Recommendation response was invalid')
        return data
      })
      .then(data => {
        setRecommendations({ status: 'success', groups: data })
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRecommendations({ status: 'error' })
      })

    return () => controller.abort()
  }, [activeMood, recRequest])

  const handleMoodApply = useCallback((mood: RecommendationMood) => {
    setActiveMood(mood)
  }, [])

  useEffect(() => {
    // Fetch personas (can be slow — non-blocking)
    startTransition(() => {
      fetch('/api/recommendations/personas')
        .then(r => r.json())
        .then(data => setPersonas(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setPerLoading(false))
    })
  }, [])

  // Movie DNA teaser — same reusable card/bundle used on the Dashboard and profiles
  useEffect(() => {
    const username = session?.user?.name
    if (!username) return
    fetch(`/api/dna/${username}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => setDnaProfile(data))
      .catch(() => {})
      .finally(() => setDnaLoading(false))
  }, [session?.user?.name])

  async function handleFeedback(recommendation: EnrichedRec, feedbackType: string) {
    try {
      const response = await fetch('/api/recommendations/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation, feedback: feedbackType }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  const groups = recommendations.status === 'success' ? recommendations.groups : null
  const recLoading = recommendations.status === 'loading'
  const totalPicks = groups
    ? groups.weThinkYoudLike.length + groups.similarToFavorites.length +
      groups.dnaBasedPicks.length + groups.expandYourTaste.length + groups.rediscoverClassics.length
    : 0

  const hero = recLoading ? (
    <HeroSkeleton />
  ) : groups?.nextFavorite ? (
    <NextFavoriteHero
      rec={groups.nextFavorite}
      onFeedback={handleFeedback}
    />
  ) : null

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6">
      <PageHeader
        title="Recommendation Center"
        lede={recLoading
          ? 'Loading your personalised picks…'
          : recommendations.status === 'error'
            ? 'Your personalised picks could not be loaded'
            : totalPicks === 0
              ? 'Your recommendation profile is ready for more movie signals'
              : `${totalPicks} personalised recommendations powered by your Movie DNA`
        }
      />

      <MoodControls onApply={handleMoodApply} loading={recLoading} />

      {/* ─── NEXT FAVORITE beside the accuracy aside ───────────────────────── */}
      <div className={hero ? 'grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : 'min-w-0'}>
        {hero}
        <RecAccuracyWidget />
      </div>

      {/* ─── Movie DNA teaser — same reusable card as Dashboard/profiles ───── */}
      {(dnaLoading || dnaProfile) && (
        <div className="min-w-0">
          <MovieDNACard profile={dnaProfile} loading={dnaLoading} compact />
        </div>
      )}

      {/* ─── Based On Your Ratings ─────────────────────────────────────────── */}
      <BasedOnRatingsSection />

      {/* ─── Because Your Friends Loved It ─────────────────────────────────── */}
      <FriendRecs />

      {/* ─── 5 rec sections ────────────────────────────────────────────────── */}
      {recommendations.status === 'error' ? (
        <div className="border-t-2 border-ns-danger pt-4" role="alert">
          <p className="mb-1 font-heading text-base text-ns-text">Recommendations couldn&apos;t load</p>
          <p className="mb-4 max-w-2xl font-body text-sm text-ns-muted">
            We could not reach the recommendation service. Your taste profile and ratings are safe.
          </p>
          <Button variant="primary" onClick={() => setRecRequest(request => request + 1)}>
            Try again
          </Button>
        </div>
      ) : recLoading ? (
        <div className="space-y-12" aria-busy="true" aria-label="Loading recommendation shelves">
          {SECTIONS.map(s => (
            <div key={s.key} className="border-t-2 border-ns-text pt-4">
              <div className="mb-5 h-6 w-48 animate-pulse rounded bg-ns-surface-2" />
              <ShelfSkeleton />
            </div>
          ))}
        </div>
      ) : totalPicks === 0 ? (
        <div className="border-t-2 border-ns-text pt-4" role="status">
          <p className="mb-1 font-heading text-lg text-ns-text">Your next picks need a little more signal</p>
          <p className="mb-5 max-w-lg font-body text-sm leading-relaxed text-ns-muted">
            Nothing matched yet, but the recommendation service loaded successfully. Rate a few films or update your favorites to shape your Movie DNA.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" href="/ratings">Rate films</Button>
            <Button variant="secondary" href="/onboarding">Update favorites</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
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
        <div className="animate-pulse border-t-2 border-ns-text pt-4">
          <div className="mb-5 h-6 w-48 rounded bg-ns-surface-2" />
          <ShelfSkeleton />
        </div>
      ) : (
        <RecPersonaSection personas={personas} />
      )}
    </div>
  )
}
