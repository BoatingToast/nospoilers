'use client'

import { useEffect, useState } from 'react'
import type { RecAccuracy } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

interface BreakdownData extends RecAccuracy {
  lovedPct:    number
  acceptedPct: number
  dismissedPct:number
  notForMePct: number
}

export default function RecAccuracyWidget() {
  const [data,    setData]    = useState<BreakdownData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recommendations/analytics')
      .then(r => r.json())
      .then(({ breakdown }) => {
        setData(breakdown ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-3xl bg-ns-surface p-6 sm:p-8" role="status" aria-label="Loading recommendation accuracy">
        <Skeleton className="h-4 w-1/2 !bg-ns-surface-2" />
        <Skeleton className="mt-4 h-10 w-1/3 !bg-ns-surface-2" />
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="rounded-3xl bg-ns-surface p-6 sm:p-8">
        <h2 className="font-heading text-xl font-bold text-ns-text">Recommendation accuracy</h2>
        <p className="mt-2 text-sm leading-relaxed text-ns-muted">
          Rate or mark recommendations to start tracking accuracy.
        </p>
      </div>
    )
  }

  const SEGMENTS = [
    { label: 'Loved', pct: data.lovedPct, color: 'bg-ns-chart-3' },
    { label: 'Accepted', pct: data.acceptedPct, color: 'bg-ns-chart-7' },
    { label: 'Not for me', pct: data.notForMePct, color: 'bg-ns-chart-1' },
    { label: 'Dismissed', pct: data.dismissedPct, color: 'bg-ns-chart-6' },
  ]

  return (
    <div className="animate-fade-in rounded-3xl bg-ns-surface p-6 sm:p-8">
      <h2 className="font-heading text-xl font-bold text-ns-text">Recommendation accuracy</h2>
      <p className="mt-3 font-display text-5xl tabular-nums text-ns-text">{data.accuracyPct}%</p>
      <p className="mt-1 text-sm tabular-nums text-ns-muted">{data.total} rated</p>

      <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {SEGMENTS.map(segment =>
          segment.pct > 0 ? (
            <span key={segment.label} className={segment.color} style={{ width: `${segment.pct}%` }} />
          ) : null
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SEGMENTS.map(segment => (
          <div key={segment.label} className="flex items-center gap-1.5 text-sm">
            <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 rounded-full ${segment.color}`} />
            <dt className="truncate text-ns-muted">{segment.label}</dt>
            <dd className="ml-auto font-semibold tabular-nums text-ns-text">{segment.pct}%</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
