'use client'

import { useEffect, useState } from 'react'

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 p-4 rounded-2xl bg-ns-surface border border-ns-border">

      {/* Recommend % — hero stat */}
      {stats.recommendPct !== null && (
        <div className="col-span-2 sm:col-span-1 flex flex-col items-start gap-0.5">
          <p className="font-display text-4xl tracking-wider text-ns-gold leading-none">
            {stats.recommendPct}%
          </p>
          <p className="text-ns-muted text-xs font-body">would recommend</p>
        </div>
      )}

      {/* Avg rating */}
      {stats.avgRating !== null && (
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-3xl tracking-wider text-white leading-none">
            {(stats.avgRating / 10).toFixed(1)}
          </p>
          <p className="text-ns-muted text-xs font-body">avg rating</p>
        </div>
      )}

      {/* Total reviews */}
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-3xl tracking-wider text-white leading-none">
          {stats.total}
        </p>
        <p className="text-ns-muted text-xs font-body">reviews</p>
      </div>

      {/* Breakdown */}
      <div className="flex flex-col gap-1 justify-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs font-body text-ns-muted">
            {stats.spoilerFree} spoiler-free
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-xs font-body text-ns-muted">
            {stats.spoilerCount} with spoilers
          </span>
        </div>
      </div>
    </div>
  )
}
