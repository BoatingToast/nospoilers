'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
import PosterRail from '@/components/discover/PosterRail'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import Panel from '@/components/ui/Panel'
import { MovieCardSkeleton, Skeleton } from '@/components/ui/Skeleton'

// ─── Section config ───────────────────────────────────────────────────────────

interface SectionConfig {
  key:     keyof Omit<CuratedRecGroups, 'nextFavorite' | 'topTraits'>
  title:   string
  tagline: string
  empty:   string
}

const SECTIONS: SectionConfig[] = [
  {
    key:     'weThinkYoudLike',
    title:   "We think you'll like",
    tagline: 'Your highest-confidence personalised picks',
    empty:   'Add more favorite films to unlock personalised picks.',
  },
  {
    key:     'similarToFavorites',
    title:   'Similar to your favorites',
    tagline: 'Films tied directly to movies you already love',
    empty:   'Complete your taste profile to see films like your favorites.',
  },
  {
    key:     'dnaBasedPicks',
    title:   'Based on your DNA',
    tagline: 'Matched to your top cinematic taste dimensions',
    empty:   'Build your taste profile to unlock DNA-based picks.',
  },
  {
    key:     'expandYourTaste',
    title:   'Expand your taste',
    tagline: 'Step outside your comfort zone — you might love these',
    empty:   'Rate more films to discover where your taste can grow.',
  },
  {
    key:     'rediscoverClassics',
    title:   'Rediscover classics',
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
    <div className="grid gap-7 rounded-3xl bg-ns-surface p-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:p-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Skeleton className="mx-auto aspect-[2/3] w-44 rounded-xl !bg-ns-surface-2 sm:w-full" />
      <div className="space-y-3 py-2">
        <Skeleton className="h-4 w-32 !bg-ns-surface-2" />
        <Skeleton className="h-11 w-2/3 !bg-ns-surface-2" />
        <Skeleton className="h-4 w-full !bg-ns-surface-2" />
        <Skeleton className="h-4 w-4/5 !bg-ns-surface-2" />
      </div>
    </div>
  )
}

function ShelfSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => <MovieCardSkeleton key={i} />)}
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
  const heading = (
    <>
      <h2 className="font-display text-3xl text-ns-text sm:text-4xl">{section.title}</h2>
      <p className="mt-1.5 text-base text-ns-muted">{section.tagline}</p>
      {showTraits && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topTraits.map(t => (
            <Badge key={t.label} size="md">{t.label} <span className="tabular-nums text-ns-text">{t.score.toFixed(1)}</span></Badge>
          ))}
        </div>
      )}
    </>
  )

  if (items.length === 0) {
    return (
      <section>
        <div className="mb-4">{heading}</div>
        <p className="rounded-2xl bg-ns-surface p-6 text-base text-ns-muted">{section.empty}</p>
      </section>
    )
  }

  return (
    <section>
      <PosterRail label={`${section.title} picks`} controlsLabel={section.title} heading={heading}>
        {items.map(rec => <CuratedRecCard key={rec.tmdbId} rec={rec} />)}
      </PosterRail>
    </section>
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

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:space-y-16 lg:pb-24">
      <div className="space-y-6">
        <PageHeader
          title="Recommendation center"
          description={
            <span key={recommendations.status} className="inline-block animate-fade-up">
              {recLoading
                ? 'Loading your personalised picks…'
                : recommendations.status === 'error'
                  ? 'Your personalised picks could not be loaded'
                  : totalPicks === 0
                    ? 'Your recommendation profile is ready for more movie signals'
                    : `${totalPicks} personalised recommendations powered by your Movie DNA`}
            </span>
          }
        />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <MoodControls onApply={handleMoodApply} loading={recLoading} />
          <RecAccuracyWidget />
        </div>
      </div>

      {/* Next favorite */}
      {recLoading ? (
        <HeroSkeleton />
      ) : groups?.nextFavorite ? (
        <NextFavoriteHero
          rec={groups.nextFavorite}
          onFeedback={handleFeedback}
        />
      ) : null}

      {/* Movie DNA teaser, the same card used on the Dashboard and profiles */}
      {(dnaLoading || dnaProfile) && (
        <Panel className="rounded-3xl p-6 sm:p-8">
          <MovieDNACard profile={dnaProfile} loading={dnaLoading} compact />
        </Panel>
      )}

      <BasedOnRatingsSection />

      <FriendRecs />

      {/* Recommendation shelves */}
      {recommendations.status === 'error' ? (
        <div role="alert">
          <EmptyState
            title="Recommendations couldn't load"
            description="We could not reach the recommendation service. Your taste profile and ratings are safe."
            action={<Button onClick={() => setRecRequest(request => request + 1)}>Try again</Button>}
          />
        </div>
      ) : recLoading ? (
        <div className="space-y-12" aria-busy="true" aria-label="Loading recommendation shelves">
          {SECTIONS.map(s => (
            <div key={s.key}>
              <Skeleton className="mb-5 h-8 w-64 max-w-full" />
              <ShelfSkeleton />
            </div>
          ))}
        </div>
      ) : totalPicks === 0 ? (
        <div role="status">
          <EmptyState
            title="Your next picks need a little more signal"
            description="Nothing matched yet, but the recommendation service loaded successfully. Rate a few films or update your favorites to shape your Movie DNA."
            action={(
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/ratings">Rate films</Button>
                <Button href="/onboarding" variant="outline">Update favorites</Button>
              </div>
            )}
          />
        </div>
      ) : (
        <div className="space-y-12 lg:space-y-16">
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

      {/* Personas */}
      {perLoading ? (
        <div aria-busy="true">
          <Skeleton className="mb-5 h-8 w-72 max-w-full" />
          <ShelfSkeleton />
        </div>
      ) : (
        <RecPersonaSection personas={personas} />
      )}
    </div>
  )
}
