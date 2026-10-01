'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DnaEvolution, DNAScores } from '@/types'
import Section from '@/components/ui/Section'

// ─── Label map ────────────────────────────────────────────────────────────────

const DIM_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotional Impact',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

// ─── Delta row ────────────────────────────────────────────────────────────────

function DeltaRow({ dim, delta }: { dim: keyof DNAScores; delta: number }) {
  const positive = delta > 0
  const abs      = Math.abs(delta).toFixed(1)

  return (
    <li className="flex items-baseline justify-between gap-4 border-t border-ns-border py-2.5 font-body text-sm">
      <span className="text-ns-text">{DIM_LABELS[dim]}</span>
      <span className={`font-medium tabular-nums ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {positive ? '+' : '−'}{abs}
      </span>
    </li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 border-t-2 border-ns-text pt-4">
      <div className="h-6 w-48 rounded bg-ns-surface-2" />
      <div className="h-3 w-64 rounded bg-ns-surface-2" />
      <div className="h-24 rounded bg-ns-surface-2" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TITLE = 'Your Taste Is Evolving'

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
      <Section
        title={TITLE}
        note="Keep rating movies — we'll show how your DNA changes over time as you build your profile."
      />
    )
  }

  const deltaEntries = Object.entries(data.deltas) as [keyof DNAScores, number][]

  if (deltaEntries.length === 0) return null

  const sorted = [...deltaEntries].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  return (
    <Section
      title={TITLE}
      note={
        <>
          Based on {data.ratingCount} rating{data.ratingCount === 1 ? '' : 's'} · DNA updated
          {data.snapshotAt ? ` since ${new Date(data.snapshotAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
        </>
      }
      href="/my-recommendations"
      linkLabel="See recs →"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        {/* Deltas */}
        <ul className="border-b border-ns-border">
          {sorted.slice(0, 6).map(([dim, delta]) => (
            <DeltaRow key={dim} dim={dim} delta={delta} />
          ))}
        </ul>

        {/* Top influencers */}
        {data.topInfluencers.length > 0 && (
          <div className="min-w-0">
            <h3 className="border-t border-ns-border pt-2.5 font-heading text-sm font-semibold text-ns-text">
              Top rated this period
            </h3>
            <ul className="mt-2">
              {data.topInfluencers.slice(0, 4).map(film => (
                <li key={film.tmdbId}>
                  <Link
                    href={`/movie/${film.tmdbId}`}
                    className="flex items-baseline justify-between gap-4 py-1.5 font-body text-sm text-ns-muted transition-colors hover:text-ns-text"
                  >
                    <span className="truncate">{film.title}</span>
                    <span className="font-medium tabular-nums text-ns-secondary-readable">{film.score}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}
