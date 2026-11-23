'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DnaEvolution, DNAScores } from '@/types'
import {
  SuspenseIcon,
  EmotionIcon,
  ComplexityIcon,
  HumorIcon,
  RealismIcon,
  ActionIcon,
  DarknessIcon,
  type IconProps,
} from '@/components/icons'
import { SectionLink } from './SectionHeading'

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

function DeltaPill({ dim, delta, index }: { dim: keyof DNAScores; delta: number; index: number }) {
  const { label, Icon } = DIM_LABELS[dim]
  const positive = delta > 0
  const abs      = Math.abs(delta).toFixed(1)

  return (
    <li
      className="ns-reveal inline-flex min-h-10 items-center gap-2 rounded-full bg-ns-surface-2 px-4 text-sm"
      style={{ '--i': index } as React.CSSProperties}
    >
      <Icon size={14} className="flex-shrink-0 text-ns-muted" />
      <span className="text-ns-text">{label}</span>
      <span className={`font-semibold tabular-nums ${positive ? 'text-ns-success' : 'text-ns-danger'}`}>
        {positive ? '+' : '−'}{abs}
      </span>
    </li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4 rounded-2xl bg-ns-surface p-6">
      <div className="h-5 w-48 rounded bg-ns-surface-2" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map(i => <div key={i} className="h-10 w-32 rounded-full bg-ns-surface-2" />)}
      </div>
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
      <section className="rounded-2xl bg-ns-surface p-6">
        <h2 className="font-heading text-xl font-bold text-ns-text">Your Taste Is Evolving</h2>
        <p className="mt-1 text-base leading-relaxed text-ns-muted">
          Keep rating movies — we&apos;ll show how your DNA changes over time as you build your profile.
        </p>
      </section>
    )
  }

  const deltaEntries = Object.entries(data.deltas) as [keyof DNAScores, number][]

  if (deltaEntries.length === 0) return null

  const sorted = [...deltaEntries].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  return (
    <section className="space-y-5 rounded-2xl bg-ns-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-ns-text">Your Taste Is Evolving</h2>
          <p className="mt-1 text-sm leading-relaxed text-ns-muted">
            Based on {data.ratingCount} rating{data.ratingCount === 1 ? '' : 's'} · DNA updated
            {data.snapshotAt ? ` since ${new Date(data.snapshotAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </p>
        </div>
        <SectionLink href="/my-recommendations">See recs</SectionLink>
      </div>

      <ul className="flex flex-wrap gap-2">
        {sorted.slice(0, 6).map(([dim, delta], index) => (
          <DeltaPill key={dim} dim={dim} delta={delta} index={index} />
        ))}
      </ul>

      {data.topInfluencers.length > 0 && (
        <div className="border-t border-ns-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-ns-text">Top rated this period</h3>
          <div className="flex flex-wrap gap-2">
            {data.topInfluencers.slice(0, 4).map(film => (
              <Link
                key={film.tmdbId}
                href={`/movie/${film.tmdbId}`}
                className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full bg-ns-surface-2 px-4 text-sm transition-colors duration-150 hover:bg-ns-surface-3"
              >
                <span className="truncate text-ns-text">{film.title}</span>
                <span className="flex-shrink-0 font-semibold tabular-nums text-ns-muted">{film.score}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
