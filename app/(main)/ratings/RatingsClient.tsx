'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import { ratingColor } from '@/lib/theme'
import ScoreDial from '@/components/ratings/ScoreDial'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/ui/Button'
import type { MovieRatingData, RatingStats } from '@/types'
import {
  ReviewsIcon, FriendsIcon, FilmIcon, EmotionIcon,
  ComplexityIcon, SuspenseIcon, ArrowRightIcon,
  type IconProps,
} from '@/components/icons'

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
  const [items,  setItems]  = useState(initialItems)
  const [sort,   setSort]   = useState<SortKey>('date')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view,   setView]   = useState<'grid' | 'list'>('grid')

  const sorted = [...items].sort((a, b) =>
    sort === 'score'
      ? b.score - a.score
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const filtered = sorted.filter(r => matchFilter(r.score, filter))

  const maxDist = Math.max(1, ...Object.values(stats.distribution))

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">

      {/* Page header */}
      <PageHeader
        title="MY RATINGS"
        lede={<>Your film journal. {total} {total === 1 ? 'film' : 'films'} rated</>}
      />

      {/* Stats */}
      {stats.totalRatings > 0 && (
        <dl className="mb-10 grid grid-cols-2 gap-x-6 border-b border-ns-border sm:grid-cols-4">
          <StatCard label="Films Rated"   value={stats.totalRatings.toString()} />
          <StatCard label="Average Score" value={stats.averageScore.toFixed(1)} />
          <StatCard label="Perfect 100s"  value={stats.perfectScores.toString()} gold={stats.perfectScores > 0} />
          <StatCard label="Loved (80+)"   value={stats.distribution['81-100'].toString()} />
        </dl>
      )}

      {stats.totalRatings > 0 && (
        <div className="mb-12 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Distribution bar chart */}
          <Section title="Score Distribution">
            <div className="flex items-end gap-2 h-28">
              {Object.entries(stats.distribution).map(([bucket, count]) => {
                const pct    = (count / maxDist) * 100
                const color  = bucket === '81-100' ? ratingColor(0.9)
                             : bucket === '61-80'  ? ratingColor(0.7)
                             : bucket === '41-60'  ? ratingColor(0.5)
                             : bucket === '21-40'  ? ratingColor(0.3)
                             : ratingColor(0.1)
                return (
                  <div key={bucket} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-ns-muted text-[11px] font-body">{count || ''}</span>
                    <div className="w-full transition-all duration-500" style={{
                      height: `${Math.max(4, pct)}%`, background: color, opacity: count === 0 ? 0.15 : 1,
                    }} />
                    <span className="text-ns-muted text-[11px] font-body text-center leading-tight">
                      {DIST_LABEL[bucket]}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Average sub-ratings */}
          {Object.values(stats.averageSubRatings).some(v => v !== null) && (
            <Section title="Average Dimensions">
              <div className="border-t border-ns-border">
                {([
                  { key: 'storytelling',  label: 'Storytelling',  Icon: ReviewsIcon   },
                  { key: 'characters',    label: 'Characters',    Icon: FriendsIcon   },
                  { key: 'entertainment', label: 'Entertainment', Icon: FilmIcon      },
                  { key: 'emotion',       label: 'Emotion',       Icon: EmotionIcon   },
                  { key: 'complexity',    label: 'Complexity',    Icon: ComplexityIcon},
                  { key: 'suspense',      label: 'Suspense',      Icon: SuspenseIcon  },
                ] as { key: string; label: string; Icon: React.ComponentType<IconProps> }[]).map(({ key, label, Icon }) => {
                  const val = stats.averageSubRatings[key as keyof typeof stats.averageSubRatings]
                  if (val === null) return null
                  return (
                    <div key={key} className="flex items-center gap-3 border-b border-ns-border py-2.5">
                      <Icon size={14} className="text-ns-secondary-readable/70 flex-shrink-0" />
                      <span className="w-28 flex-shrink-0 text-ns-muted text-xs font-body">{label}</span>
                      <div className="h-1 min-w-0 flex-1 bg-ns-surface-2 overflow-hidden">
                        <div className="h-full bg-ns-secondary/70"
                          style={{ width: `${val * 10}%` }} />
                      </div>
                      <span className="w-10 flex-shrink-0 text-right text-ns-text text-xs font-body font-medium">{val}/10</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Controls */}
      {stats.totalRatings > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ns-text pt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`min-h-10 rounded border px-3 py-1 text-xs font-body transition-colors ${
                  filter === f
                    ? 'border-ns-text bg-ns-text text-ns-bg'
                    : 'border-ns-border text-ns-muted hover:border-ns-text hover:text-ns-text'
                }`}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="min-h-10 bg-ns-surface border border-ns-border rounded px-3 py-1.5
                         text-ns-muted text-xs font-body focus:outline-none">
              <option value="date">Date rated</option>
              <option value="score">Score</option>
            </select>
            {/* View toggle */}
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              className="flex h-10 w-10 items-center justify-center rounded border border-ns-border text-ns-muted
                         hover:border-ns-text hover:text-ns-text transition-colors">
              {view === 'grid'
                ? <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h2a1 1 0 010 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1z"/></svg>
                : <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              }
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalRatings === 0 && (
        <Section
          title="NO RATINGS YET"
          note="Rate films you've seen to build your personal film journal and improve your recommendations."
          className="mt-10"
        >
          <Button variant="primary" href="/discover">
            Discover Films <ArrowRightIcon size={14} />
          </Button>
        </Section>
      )}

      {/* Rating grid / list */}
      {filtered.length > 0 && (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(r => <RatingCard key={r.id} rating={r} />)}
          </div>
        ) : (
          <div className="border-t border-ns-border">
            {filtered.map(r => <RatingRow key={r.id} rating={r} />)}
          </div>
        )
      )}

      {filtered.length === 0 && stats.totalRatings > 0 && (
        <p className="border-t border-ns-border py-6 text-ns-muted font-body text-sm">
          No ratings match this filter.
        </p>
      )}

      {/* Perfects shelf */}
      {stats.perfectScores > 0 && (
        <Section title="Perfect 100 Films" className="mt-14">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6">
            {items.filter(r => r.score === 100).map(r => (
              <Link key={r.id} href={`/movie/${r.tmdbId}`}
                className="flex-shrink-0 w-[90px] group">
                <div className="relative aspect-[2/3] rounded overflow-hidden border border-ns-secondary/50
                                group-hover:border-ns-secondary transition-colors mb-1.5">
                  <Image
                    src={tmdbImageUrl(r.posterPath, 'w185')} alt={r.title}
                    fill className="object-cover" sizes="90px"
                  />
                  <span className="absolute bottom-0 left-0 bg-ns-bg px-1.5
                                   text-ns-secondary-readable font-display text-lg leading-tight tracking-wider">
                    100
                  </span>
                </div>
                <p className="text-ns-text text-[11px] font-body leading-tight truncate">
                  {r.title}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="py-4">
      <dd className={`font-display text-3xl leading-none tracking-wider ${gold ? 'text-ns-secondary-readable' : 'text-ns-text'}`}>
        {value}
      </dd>
      <dt className="text-ns-muted text-xs font-body mt-1">{label}</dt>
    </div>
  )
}

function RatingCard({ rating }: { rating: MovieRatingData }) {
  const color = ratingColor(rating.score / 100)
  return (
    <Link href={`/movie/${rating.tmdbId}`} className="group block min-w-0">
      <div className="relative aspect-[2/3] rounded overflow-hidden border border-ns-border
                      group-hover:border-ns-text/60 transition-colors mb-2">
        <Image
          src={tmdbImageUrl(rating.posterPath, 'w342')} alt={rating.title}
          fill className="object-cover"
          sizes="(max-width: 640px) 50vw, 200px"
        />

        {/* Score badge */}
        <div className="absolute bottom-0 left-0 flex items-baseline gap-0.5 bg-ns-bg px-2 py-0.5">
          <span className="font-display text-2xl leading-tight tracking-wider" style={{ color }}>
            {rating.score}
          </span>
          <span className="text-ns-muted text-[11px] font-body">/100</span>
        </div>

        {/* Dimension-rating indicator dot */}
        {(rating.storytelling !== null || rating.characters !== null) && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-ns-secondary/80"
            title="Includes dimension ratings" />
        )}
      </div>
      <p className="text-ns-text text-xs font-body font-medium leading-tight line-clamp-2">
        {rating.title}
      </p>
    </Link>
  )
}

function RatingRow({ rating }: { rating: MovieRatingData }) {
  const color = ratingColor(rating.score / 100)
  const date  = new Date(rating.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Link href={`/movie/${rating.tmdbId}`}
      className="flex items-center gap-4 border-b border-ns-border py-3 group">
      {/* Poster */}
      <div className="flex-shrink-0 relative w-10 h-14 rounded-sm overflow-hidden border border-ns-border">
        <Image src={tmdbImageUrl(rating.posterPath, 'w185')} alt={rating.title}
          fill className="object-cover" sizes="40px" />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-ns-text text-sm font-body font-medium truncate group-hover:text-ns-secondary-readable
                      transition-colors">
          {rating.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-ns-muted text-[11px] font-body">{date}</span>
          <span className="text-ns-muted text-[11px]">·</span>
          <span className="text-[11px] font-body" style={{ color }}>
            {scoreLabel(rating.score)}
          </span>
        </div>
        {rating.review && (
          <p className="text-ns-muted text-[11px] font-body mt-1 line-clamp-1 italic">
            "{rating.review}"
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <span className="font-display text-2xl tracking-wider" style={{ color }}>
          {rating.score}
        </span>
        <span className="text-ns-muted text-[11px] font-body block">/100</span>
      </div>
    </Link>
  )
}
