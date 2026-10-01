'use client'

import { useEffect, useState } from 'react'
import type { RecAccuracy } from '@/types'
import Section from '@/components/ui/Section'

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
      <div className="animate-pulse border-t-2 border-ns-text pt-4">
        <div className="mb-4 h-6 w-1/2 rounded bg-ns-surface-2" />
        <div className="h-8 w-1/3 rounded bg-ns-surface-2" />
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <Section
        title="Recommendation Accuracy"
        note="Rate or mark recommendations to start tracking accuracy."
      />
    )
  }

  const accuracyColor =
    data.accuracyPct >= 75 ? 'text-ns-success'
    : data.accuracyPct >= 50 ? 'text-ns-secondary-readable'
    : 'text-ns-danger'

  const SEGMENTS = [
    { label: 'Loved',      pct: data.lovedPct,    color: 'bg-ns-success' },
    { label: 'Accepted',   pct: data.acceptedPct, color: 'bg-ns-info' },
    { label: 'Not For Me', pct: data.notForMePct, color: 'bg-ns-danger' },
    { label: 'Dismissed',  pct: data.dismissedPct,color: 'bg-ns-border' },
  ]

  return (
    <Section title="Recommendation Accuracy">
      <div className="grid min-w-0 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-10">
        <div>
          <p className="font-display text-6xl leading-none tracking-wide">
            <span className={accuracyColor}>{data.accuracyPct}%</span>
          </p>
          <p className="mt-1 font-body text-xs text-ns-muted">
            {data.total} rated
          </p>
        </div>

        <div className="min-w-0">
          {/* Stacked bar */}
          <div className="flex h-2 gap-px overflow-hidden">
            {SEGMENTS.map(s =>
              s.pct > 0 ? (
                <div
                  key={s.label}
                  className={s.color}
                  style={{ width: `${s.pct}%` }}
                />
              ) : null
            )}
          </div>

          {/* Legend */}
          <dl className="mt-3 border-b border-ns-border">
            {SEGMENTS.map(s => (
              <div key={s.label} className="flex items-center justify-between gap-3 border-t border-ns-border py-1.5 font-body text-xs">
                <dt className="flex items-center gap-2 text-ns-muted">
                  <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 ${s.color}`} />
                  {s.label}
                </dt>
                <dd className="text-ns-text">{s.pct}%</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}
