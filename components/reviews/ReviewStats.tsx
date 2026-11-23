'use client'

import { useEffect, useState } from 'react'
import GrowBar from '@/components/movie/GrowBar'

interface Stats {
  total:        number
  spoilerFree:  number
  spoilerCount: number
  avgRating:    number | null
  recommendPct: number | null
}

interface Props { tmdbId: number }

export default function ReviewStats({ tmdbId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch(`/api/reviews/stats?tmdbId=${tmdbId}`)
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {})
  }, [tmdbId])

  if (!stats || stats.total === 0) return null

  return (
    <div className="mb-8 grid animate-fade-up grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.recommendPct !== null && (
        <div className="col-span-2 rounded-xl bg-ns-tile-rose p-5 lg:col-span-1">
          <p className="font-display text-5xl tabular-nums text-ns-text">{stats.recommendPct}%</p>
          <p className="mt-1 text-sm text-ns-muted">would recommend</p>
          <GrowBar value={stats.recommendPct / 100} className="mt-3" trackClassName="bg-black/25" />
        </div>
      )}

      {stats.avgRating !== null && (
        <div className="rounded-xl bg-ns-tile-yellow p-5">
          <p className="font-display text-4xl tabular-nums text-ns-text">{(stats.avgRating / 10).toFixed(1)}</p>
          <p className="mt-1 text-sm text-ns-muted">avg rating</p>
        </div>
      )}

      <div className="rounded-xl bg-ns-tile-blue p-5">
        <p className="font-display text-4xl tabular-nums text-ns-text">{stats.total}</p>
        <p className="mt-1 text-sm text-ns-muted">reviews</p>
      </div>

      <div className="col-span-2 flex flex-col justify-center gap-2 rounded-xl bg-ns-surface p-5 lg:col-span-1">
        <p className="flex items-center gap-2 text-sm text-ns-muted">
          <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-ns-success" />
          <span><span className="font-semibold tabular-nums text-ns-text">{stats.spoilerFree}</span> spoiler-free</span>
        </p>
        <p className="flex items-center gap-2 text-sm text-ns-muted">
          <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-ns-warning" />
          <span><span className="font-semibold tabular-nums text-ns-text">{stats.spoilerCount}</span> with spoilers</span>
        </p>
      </div>
    </div>
  )
}
