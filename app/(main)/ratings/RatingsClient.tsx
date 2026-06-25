'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import ScoreDial from '@/components/ratings/ScoreDial'
import type { MovieRatingData, RatingStats } from '@/types'
import {
  ReviewsIcon, FriendsIcon, FilmIcon, EmotionIcon,
  ComplexityIcon, SuspenseIcon, RatingsIcon, ArrowRightIcon,
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

function scoreColor(v: number): string {
  if (v >= 80) return '#C8963E'
  if (v >= 60) return '#6DBF91'
  if (v >= 40) return '#7B9CC8'
  return '#C87B6D'
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
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Page header */}
      <div className="mb-8">
        <p className="text-ns-gold text-[10px] tracking-widest uppercase font-body mb-1">Film Journal</p>
        <h1 className="font-display text-5xl tracking-wider text-ns-text">MY RATINGS</h1>
        <p className="text-ns-muted text-sm font-body mt-1">
          {total} {total === 1 ? 'film' : 'films'} rated
        </p>
      </div>

      {/* Stats cards */}
      {stats.totalRatings > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Films Rated"   value={stats.totalRatings.toString()} />
          <StatCard label="Average Score" value={stats.averageScore.toFixed(1)} />
          <StatCard label="Perfect 100s"  value={stats.perfectScores.toString()} gold={stats.perfectScores > 0} />
          <StatCard label="Loved (80+)"   value={stats.distribution['81-100'].toString()} />
        </div>
      )}

      {/* Distribution bar chart */}
      {stats.totalRatings > 0 && (
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 mb-8">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Score Distribution</p>
          <div className="flex items-end gap-2 h-20">
            {Object.entries(stats.distribution).map(([bucket, count]) => {
              const pct    = (count / maxDist) * 100
              const color  = bucket === '81-100' ? '#C8963E'
                           : bucket === '61-80'  ? '#6DBF91'
                           : bucket === '41-60'  ? '#7B9CC8'
                           : bucket === '21-40'  ? '#C87B6D'
                           : '#9B6DC8'
              return (
                <div key={bucket} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-ns-muted text-[10px] font-body">{count || ''}</span>
                  <div className="w-full rounded-t-md transition-all duration-500" style={{
                    height: `${Math.max(4, pct)}%`, background: color, opacity: count === 0 ? 0.15 : 1,
                  }} />
                  <span className="text-ns-muted/60 text-[9px] font-body text-center leading-tight">
                    {DIST_LABEL[bucket]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Average sub-ratings */}
      {stats.totalRatings > 0 && Object.values(stats.averageSubRatings).some(v => v !== null) && (
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 mb-8">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Average Dimensions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
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
                <div key={key} className="flex items-center gap-2">
                  <Icon size={14} className="text-ns-gold/70 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-ns-muted text-[10px] font-body">{label}</span>
                      <span className="text-ns-text text-[10px] font-body font-medium">{val}/10</span>
                    </div>
                    <div className="h-1 rounded-full bg-ns-bg overflow-hidden">
                      <div className="h-full rounded-full bg-ns-gold/70"
                        style={{ width: `${val * 10}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      {stats.totalRatings > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-body transition-all ${
                  filter === f
                    ? 'bg-ns-gold text-ns-bg'
                    : 'bg-ns-surface border border-ns-border text-ns-muted hover:text-ns-text'
                }`}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="bg-ns-surface border border-ns-border rounded-lg px-3 py-1.5
                         text-ns-muted text-xs font-body focus:outline-none">
              <option value="date">Date rated</option>
              <option value="score">Score</option>
            </select>
            {/* View toggle */}
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              className="p-1.5 rounded-lg bg-ns-surface border border-ns-border text-ns-muted
                         hover:text-ns-text transition-colors">
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
        <div className="text-center py-20">
          <RatingsIcon size={52} className="text-ns-gold/40 mx-auto mb-4" />
          <h2 className="font-display text-3xl tracking-wider text-ns-text mb-2">NO RATINGS YET</h2>
          <p className="text-ns-muted font-body text-sm mb-6 max-w-xs mx-auto">
            Rate films you've seen to build your personal film journal and improve your recommendations.
          </p>
          <Link href="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ns-gold
                       text-ns-bg font-body font-semibold text-sm hover:bg-amber-400 transition-colors">
            Discover Films <ArrowRightIcon size={14} />
          </Link>
        </div>
      )}

      {/* Rating grid / list */}
      {filtered.length > 0 && (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(r => <RatingCard key={r.id} rating={r} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => <RatingRow key={r.id} rating={r} />)}
          </div>
        )
      )}

      {filtered.length === 0 && stats.totalRatings > 0 && (
        <div className="text-center py-12 text-ns-muted font-body text-sm">
          No ratings match this filter.
        </div>
      )}

      {/* Perfects shelf */}
      {stats.perfectScores > 0 && (
        <div className="mt-12">
          <p className="text-ns-gold text-[10px] tracking-widest uppercase font-body mb-4">
            Perfect 100 Films
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {items.filter(r => r.score === 100).map(r => (
              <Link key={r.id} href={`/movie/${r.tmdbId}`}
                className="flex-shrink-0 w-[90px] group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-ns-gold/50
                                group-hover:border-ns-gold transition-colors mb-1.5
                                shadow-[0_0_20px_rgba(200,150,62,0.3)]">
                  <Image
                    src={tmdbImageUrl(r.posterPath, 'w185')} alt={r.title}
                    fill className="object-cover" sizes="90px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2
                                   text-ns-gold font-display text-lg tracking-wider">
                    100
                  </span>
                </div>
                <p className="text-ns-text text-[10px] font-body text-center leading-tight truncate">
                  {r.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="bg-ns-surface border border-ns-border rounded-xl p-4 text-center">
      <p className={`font-display text-3xl tracking-wider ${gold ? 'text-ns-gold' : 'text-ns-text'}`}>
        {value}
      </p>
      <p className="text-ns-muted text-xs font-body mt-0.5">{label}</p>
    </div>
  )
}

function scoreColorHex(v: number): string {
  if (v >= 80) return '#C8963E'
  if (v >= 60) return '#6DBF91'
  if (v >= 40) return '#7B9CC8'
  return '#C87B6D'
}

function RatingCard({ rating }: { rating: MovieRatingData }) {
  const color = scoreColorHex(rating.score)
  return (
    <Link href={`/movie/${rating.tmdbId}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-ns-border
                      group-hover:border-ns-gold/30 transition-colors mb-2">
        <Image
          src={tmdbImageUrl(rating.posterPath, 'w342')} alt={rating.title}
          fill className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, 200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Score badge */}
        <div className="absolute bottom-2 left-2 flex items-baseline gap-0.5">
          <span className="font-display text-2xl tracking-wider" style={{ color }}>
            {rating.score}
          </span>
          <span className="text-white/40 text-[10px] font-body">/100</span>
        </div>

        {/* Dimension-rating indicator dot */}
        {(rating.storytelling !== null || rating.characters !== null) && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-ns-gold/80"
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
  const color = scoreColorHex(rating.score)
  const date  = new Date(rating.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Link href={`/movie/${rating.tmdbId}`}
      className="flex items-center gap-4 p-3 rounded-xl bg-ns-surface border border-ns-border
                 hover:border-ns-gold/30 transition-colors group">
      {/* Poster */}
      <div className="flex-shrink-0 relative w-10 h-14 rounded-lg overflow-hidden border border-ns-border">
        <Image src={tmdbImageUrl(rating.posterPath, 'w185')} alt={rating.title}
          fill className="object-cover" sizes="40px" />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-ns-text text-sm font-body font-medium truncate group-hover:text-ns-gold
                      transition-colors">
          {rating.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-ns-muted/50 text-[10px] font-body">{date}</span>
          <span className="text-ns-muted/30 text-[10px]">·</span>
          <span className="text-[10px] font-body" style={{ color }}>
            {scoreLabel(rating.score)}
          </span>
        </div>
        {rating.review && (
          <p className="text-ns-muted/70 text-[11px] font-body mt-1 line-clamp-1 italic">
            "{rating.review}"
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
        <span className="font-display text-2xl tracking-wider" style={{ color }}>
          {rating.score}
        </span>
        <span className="text-ns-muted/40 text-[10px] font-body block">/100</span>
      </div>
    </Link>
  )
}
