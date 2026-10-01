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
    <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-5 border-b border-ns-border pb-6 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">

      {/* Recommend % — lead stat */}
      {stats.recommendPct !== null && (
        <div className="col-span-2 flex flex-col-reverse gap-1 sm:col-span-1">
          <dt className="text-ns-muted text-xs font-body">would recommend</dt>
          <dd className="font-display text-4xl tracking-wide text-ns-secondary-readable leading-none">
            {stats.recommendPct}%
          </dd>
        </div>
      )}

      {/* Avg rating */}
      {stats.avgRating !== null && (
        <div className="flex flex-col-reverse gap-1">
          <dt className="text-ns-muted text-xs font-body">avg rating</dt>
          <dd className="font-display text-3xl tracking-wide text-ns-text leading-none">
            {(stats.avgRating / 10).toFixed(1)}
          </dd>
        </div>
      )}

      {/* Total reviews */}
      <div className="flex flex-col-reverse gap-1">
        <dt className="text-ns-muted text-xs font-body">reviews</dt>
        <dd className="font-display text-3xl tracking-wide text-ns-text leading-none">
          {stats.total}
        </dd>
      </div>

      {/* Breakdown */}
      <div className="col-span-2 flex flex-col justify-end gap-1 sm:col-span-1">
        <dt className="sr-only">Spoiler breakdown</dt>
        <dd className="text-xs font-body text-ns-muted">{stats.spoilerFree} spoiler-free</dd>
        <dd className="text-xs font-body text-ns-muted">{stats.spoilerCount} with spoilers</dd>
      </div>
    </dl>
  )
}
