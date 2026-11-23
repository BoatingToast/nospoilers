'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import { cn } from '@/lib/utils'
import { ratingColor } from '@/lib/theme'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { ArrowRightIcon } from '@/components/icons'
import {
  FilterInput,
  Meter,
  PillTabs,
  SortSelect,
  ViewToggle,
  posterGridClass,
  posterZoomClass,
  revealDelay,
  useInView,
  type LibraryView,
} from '@/components/watchlist/LibraryControls'
import type { MovieRatingData, RatingStats } from '@/types'

interface Props {
  initialItems: MovieRatingData[]
  total:        number
  stats:        RatingStats
}

type SortKey = 'date' | 'score'
type FilterKey = 'all' | 'loved' | 'liked' | 'mixed' | 'disliked' | 'perfect'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All', loved: 'Loved (80+)', liked: 'Liked (60–79)',
  mixed: 'Mixed (40–59)', disliked: 'Disliked (<40)', perfect: '100s',
}

const FILTER_OPTIONS = (Object.keys(FILTER_LABELS) as FilterKey[]).map(value => ({ value, label: FILTER_LABELS[value] }))

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Date rated' },
  { value: 'score', label: 'Score' },
]

const DIMENSIONS = [
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characters', label: 'Characters' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'suspense', label: 'Suspense' },
] as const

function matchFilter(score: number, filter: FilterKey): boolean {
  if (filter === 'all')      return true
  if (filter === 'perfect')  return score === 100
  if (filter === 'loved')    return score >= 80
  if (filter === 'liked')    return score >= 60 && score < 80
  if (filter === 'mixed')    return score >= 40 && score < 60
  if (filter === 'disliked') return score < 40
  return true
}

function scoreLabel(v: number): string {
  if (v >= 90) return 'Masterpiece'
  if (v >= 80) return 'Loved it'
  if (v >= 70) return 'Really good'
  if (v >= 60) return 'Liked it'
  if (v >= 50) return 'Decent'
  if (v >= 40) return 'Mixed'
  return 'Disliked'
}

const DIST_LABEL: Record<string, string> = {
  '1-20': 'Hated', '21-40': 'Disliked', '41-60': 'Mixed', '61-80': 'Liked', '81-100': 'Loved'
}

export default function RatingsClient({ initialItems, total, stats }: Props) {
  const [items]            = useState(initialItems)
  const [sort,   setSort]   = useState<SortKey>('date')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view,   setView]   = useState<LibraryView>('grid')
  const [query,  setQuery]  = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...items]
      .sort((a, b) =>
        sort === 'score'
          ? b.score - a.score
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter(r => matchFilter(r.score, filter))
      .filter(r => !needle || r.title.toLowerCase().includes(needle))
  }, [items, sort, filter, query])

  const distribution = Object.entries(stats.distribution)
  const maxDist = Math.max(1, ...Object.values(stats.distribution))
  const dimensions = DIMENSIONS.flatMap(dimension => {
    const value = stats.averageSubRatings[dimension.key as keyof typeof stats.averageSubRatings]
    return value === null ? [] : [{ ...dimension, value }]
  })
  const perfects = items.filter(r => r.score === 100)

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <PageHeader
        className="mb-10"
        title="My ratings."
        description={`${total} ${total === 1 ? 'film' : 'films'} rated`}
      />

      {stats.totalRatings === 0 ? (
        <EmptyState
          title="No ratings yet"
          description="Rate films you've seen to build your personal film journal and improve your recommendations."
          action={<Button href="/discover">Discover films <ArrowRightIcon size={16} /></Button>}
        />
      ) : (
        <>
          <section aria-label="Rating summary" className={cn(
            'mb-10 grid gap-10 rounded-3xl bg-ns-surface p-7 sm:p-10',
            dimensions.length > 0
              ? 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]'
              : 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2.2fr)]',
          )}>
            <div>
              <p className="font-display text-7xl tabular-nums text-ns-text sm:text-8xl">
                {stats.averageScore.toFixed(1)}
              </p>
              <p className="mt-2 text-base text-ns-muted">Average score</p>
              <dl className="mt-6 grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-2">
                <SummaryStat label="Films rated" value={stats.totalRatings} />
                <SummaryStat label="Perfect 100s" value={stats.perfectScores} />
                <SummaryStat label="Loved (80+)" value={stats.distribution['81-100']} />
              </dl>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-ns-text">Score distribution</h2>
              <div className="mt-5 flex items-end gap-2 sm:gap-3">
                {distribution.map(([bucket, count], index) => (
                  <DistributionBar
                    key={bucket}
                    label={DIST_LABEL[bucket]}
                    count={count}
                    fraction={count / maxDist}
                    peak={count === maxDist && count > 0}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {dimensions.length > 0 && (
              <div>
                <h2 className="font-heading text-lg font-bold text-ns-text">Average dimensions</h2>
                <dl className="mt-5 space-y-3">
                  {dimensions.map(({ key, label, value }) => (
                    <div key={key}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <dt className="text-ns-muted">{label}</dt>
                        <dd className="font-semibold tabular-nums text-ns-text">{value}/10</dd>
                      </div>
                      <Meter value={value / 10} />
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          {perfects.length > 0 && (
            <section className="ns-reveal mb-10">
              <h2 className="font-heading text-2xl font-bold text-ns-text">Perfect 100 films</h2>
              <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6">
                {perfects.map(r => (
                  <Link key={r.id} href={`/movie/${r.tmdbId}`} className="group w-28 flex-shrink-0 sm:w-32">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                      <PosterFill path={r.posterPath} size="w185" className={posterZoomClass} sizes="128px" />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                      <span className="absolute bottom-2 left-2.5 font-display text-2xl tabular-nums text-white">100</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                      {r.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <PillTabs label="Filter by score" options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
            <div className="flex flex-wrap items-center gap-2">
              <FilterInput
                label="Filter ratings by title"
                placeholder="Filter by title"
                value={query}
                onChange={setQuery}
                className="min-w-0 flex-1 basis-full sm:basis-56"
              />
              <SortSelect label="Sort ratings" value={sort} options={SORT_OPTIONS} onChange={setSort} className="min-w-0 flex-1 sm:flex-none" />
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No ratings match this filter."
              description="Try a different score range or title."
              action={<Button variant="secondary" onClick={() => { setFilter('all'); setQuery('') }}>Clear filters</Button>}
            />
          ) : view === 'grid' ? (
            <div key={`${filter}-${sort}`} className={cn(posterGridClass, 'animate-fade-up')}>
              {filtered.map((r, index) => (
                <div key={r.id} className={index > 5 ? 'ns-reveal' : undefined} style={index > 5 ? revealDelay(index) : undefined}>
                  <RatingCard rating={r} />
                </div>
              ))}
            </div>
          ) : (
            <ul key={`${filter}-${sort}-list`} className="animate-fade-up divide-y divide-ns-border rounded-2xl bg-ns-surface px-3 sm:px-5">
              {filtered.map((r, index) => (
                <li key={r.id} className={index > 7 ? 'ns-reveal' : undefined} style={index > 7 ? revealDelay(index) : undefined}>
                  <RatingRow rating={r} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse gap-0.5 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
      <dt className="text-sm text-ns-muted">{label}</dt>
      <dd className="font-heading text-xl font-bold tabular-nums text-ns-text">{value}</dd>
    </div>
  )
}

function DistributionBar({ label, count, fraction, peak, index }: {
  label:    string
  count:    number
  fraction: number
  peak:     boolean
  index:    number
}) {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className="text-sm font-semibold tabular-nums text-ns-text">{count}</span>
      <div ref={ref} aria-hidden="true" className="relative h-32 w-full overflow-hidden rounded-lg bg-ns-surface-2">
        <div
          data-in={inView ? 'true' : undefined}
          style={{ '--bar': fraction, transitionDelay: `${index * 60}ms` } as CSSProperties}
          className={cn(
            'absolute inset-0 rounded-lg transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            '[transform:translateY(calc((1-var(--bar))*100%))]',
            '[html[data-motion=on]_&:not([data-in=true])]:[transform:translateY(100%)]',
            peak ? 'bg-ns-secondary' : 'bg-ns-surface-3',
          )}
        />
      </div>
      <span className="w-full truncate text-center text-xs text-ns-muted">{label}</span>
    </div>
  )
}

function RatingCard({ rating }: { rating: MovieRatingData }) {
  return (
    <Link href={`/movie/${rating.tmdbId}`} className="group block min-w-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
        <PosterFill
          path={rating.posterPath}
          size="w342"
          className={posterZoomClass}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute inset-x-2.5 bottom-2.5">
          <p className="flex items-baseline gap-1 text-white">
            <span className="font-display text-3xl tabular-nums">{rating.score}</span>
            <span className="text-xs">/100</span>
          </p>
          <Meter
            value={rating.score / 100}
            className="mt-1.5 h-1 bg-white/20"
            fillClassName=""
            fillStyle={{ background: ratingColor(rating.score / 100) }}
          />
        </div>
        {(rating.storytelling !== null || rating.characters !== null) && (
          <span title="Includes dimension ratings" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-ns-accent">
            <span className="sr-only">Includes dimension ratings</span>
          </span>
        )}
      </div>
      <p className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {rating.title}
      </p>
      <p className="mt-0.5 truncate text-sm text-ns-muted">{scoreLabel(rating.score)}</p>
    </Link>
  )
}

function RatingRow({ rating }: { rating: MovieRatingData }) {
  const color = ratingColor(rating.score / 100)
  const date  = new Date(rating.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Link href={`/movie/${rating.tmdbId}`} className="group flex items-center gap-4 py-3">
      <div className="relative aspect-[2/3] w-12 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-2 sm:w-14">
        <PosterFill path={rating.posterPath} size="w185" className={posterZoomClass} sizes="56px" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
          {rating.title}
        </p>
        <p className="mt-0.5 truncate text-sm text-ns-muted">
          {date} · <span style={{ color }}>{scoreLabel(rating.score)}</span>
        </p>
        {rating.review && (
          <p className="mt-1 line-clamp-1 text-sm italic text-ns-muted">&ldquo;{rating.review}&rdquo;</p>
        )}
      </div>

      <p className="flex flex-shrink-0 items-baseline gap-0.5">
        <span className="font-display text-3xl tabular-nums" style={{ color }}>{rating.score}</span>
        <span className="text-xs text-ns-muted">/100</span>
      </p>
    </Link>
  )
}
