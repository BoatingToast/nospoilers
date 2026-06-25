'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DnaEvolution, DNAScores } from '@/types'
import {
  MovieDnaIcon,
  SuspenseIcon,
  EmotionIcon,
  ComplexityIcon,
  HumorIcon,
  RealismIcon,
  ActionIcon,
  DarknessIcon,
  ArrowRightIcon,
  type IconProps,
} from '@/components/icons'

// ─── Label map ────────────────────────────────────────────────────────────────

const DIM_LABELS: Record<keyof DNAScores, { label: string; Icon: React.ComponentType<IconProps> }> = {
  suspenseScore:        { label: 'Suspense',         Icon: SuspenseIcon   },
  emotionalImpactScore: { label: 'Emotional Impact', Icon: EmotionIcon    },
  complexityScore:      { label: 'Complexity',       Icon: ComplexityIcon },
  humorScore:           { label: 'Humor',            Icon: HumorIcon      },
  realismScore:         { label: 'Realism',          Icon: RealismIcon    },
  actionScore:          { label: 'Action',           Icon: ActionIcon     },
  darknessScore:        { label: 'Darkness',         Icon: DarknessIcon   },
}

// ─── Delta pill ───────────────────────────────────────────────────────────────

function DeltaPill({ dim, delta }: { dim: keyof DNAScores; delta: number }) {
  const { label, Icon } = DIM_LABELS[dim]
  const positive = delta > 0
  const abs      = Math.abs(delta).toFixed(1)

  return (
    <div className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body border
      ${positive
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
      }
    `}>
      <Icon size={12} className="flex-shrink-0" />
      <span className="text-white/80">{label}</span>
      <span className="font-medium">
        {positive ? '+' : '−'}{abs}
      </span>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 animate-pulse space-y-3">
      <div className="h-3 bg-ns-border rounded w-48" />
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3].map(i => <div key={i} className="h-6 bg-ns-border rounded-full w-28" />)}
      </div>
      <div className="h-2 bg-ns-border rounded w-64" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DnaEvolutionWidget() {
  const [data,    setData]    = useState<DnaEvolution | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile/dna-evolution')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  if (!data || !data.previous) {
    if (!data || data.ratingCount < 5) return null

    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <MovieDnaIcon size={16} className="text-ns-gold flex-shrink-0" />
          <h2 className="text-sm font-heading text-white">Your Taste Is Evolving</h2>
        </div>
        <p className="text-xs font-body text-ns-muted">
          Keep rating movies — we&apos;ll show how your DNA changes over time as you build your profile.
        </p>
      </div>
    )
  }

  const deltaEntries = Object.entries(data.deltas) as [keyof DNAScores, number][]

  if (deltaEntries.length === 0) return null

  const sorted = [...deltaEntries].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MovieDnaIcon size={16} className="text-ns-gold flex-shrink-0" />
            <h2 className="text-sm font-heading text-white">Your Taste Is Evolving</h2>
          </div>
          <p className="text-[11px] font-body text-ns-muted">
            Based on {data.ratingCount} rating{data.ratingCount === 1 ? '' : 's'} · DNA updated
            {data.snapshotAt ? ` since ${new Date(data.snapshotAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </p>
        </div>
        <Link
          href="/my-recommendations"
          className="text-[11px] font-body text-ns-gold hover:text-ns-gold/80 transition-colors flex-shrink-0 flex items-center gap-1"
        >
          See recs <ArrowRightIcon size={11} />
        </Link>
      </div>

      {/* Delta pills */}
      <div className="flex flex-wrap gap-2">
        {sorted.slice(0, 6).map(([dim, delta]) => (
          <DeltaPill key={dim} dim={dim} delta={delta} />
        ))}
      </div>

      {/* Top influencers */}
      {data.topInfluencers.length > 0 && (
        <div>
          <p className="text-[10px] font-body text-ns-muted mb-2 uppercase tracking-wide">
            Top rated this period
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.topInfluencers.slice(0, 4).map(film => (
              <Link
                key={film.tmdbId}
                href={`/movie/${film.tmdbId}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-[10px] font-body text-white/70 truncate max-w-[100px]">{film.title}</span>
                <span className="text-[10px] font-body text-ns-gold font-medium">{film.score}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
