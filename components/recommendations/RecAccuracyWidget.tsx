'use client'

import { useEffect, useState } from 'react'
import type { RecAccuracy } from '@/types'
import { ThumbUpIcon, EyeIcon, ThumbDownIcon, CloseIcon, RecsIcon } from '@/components/icons'

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
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-ns-border rounded w-1/2 mb-4" />
        <div className="h-8 bg-ns-border rounded w-1/3" />
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
        <p className="text-xs font-body text-ns-muted uppercase tracking-wider mb-1">
          Recommendation Accuracy
        </p>
        <p className="text-xs font-body text-ns-muted">
          Rate or mark recommendations to start tracking accuracy.
        </p>
      </div>
    )
  }

  const accuracyColor =
    data.accuracyPct >= 75 ? 'text-emerald-400'
    : data.accuracyPct >= 50 ? 'text-ns-gold'
    : 'text-red-400'

  const SEGMENTS = [
    { label: 'Loved',      Icon: ThumbUpIcon,   pct: data.lovedPct,    color: 'bg-emerald-500' },
    { label: 'Accepted',   Icon: EyeIcon,       pct: data.acceptedPct, color: 'bg-teal-500' },
    { label: 'Not For Me', Icon: ThumbDownIcon, pct: data.notForMePct, color: 'bg-red-500' },
    { label: 'Dismissed',  Icon: CloseIcon,     pct: data.dismissedPct,color: 'bg-ns-border' },
  ]

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-body text-ns-muted uppercase tracking-wider mb-0.5">
            Recommendation Accuracy
          </p>
          <p className="text-3xl font-heading font-bold leading-none">
            <span className={accuracyColor}>{data.accuracyPct}%</span>
          </p>
          <p className="text-xs font-body text-ns-muted mt-1">
            {data.total} rated
          </p>
        </div>
        <RecsIcon size={28} className="text-ns-gold/25" />
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {SEGMENTS.map(s =>
          s.pct > 0 ? (
            <div
              key={s.label}
              className={`${s.color} transition-all duration-700`}
              style={{ width: `${s.pct}%` }}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {SEGMENTS.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${s.color} flex-shrink-0`} />
            <span className="text-[10px] font-body text-ns-muted">
              {s.label} <span className="text-ns-text">{s.pct}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
