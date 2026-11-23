'use client'

import type { DNAScores } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  current:   DNAScores
  predicted: DNAScores
  deltas:    Record<keyof DNAScores, number>
  loading:   boolean
}

const DNA_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotion',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

const DIMS = Object.keys(DNA_LABELS) as (keyof DNAScores)[]

function fmt(v: number): string { return (v * 10).toFixed(0) }
function fmtDelta(d: number): string {
  const scaled = Math.round(d * 10)
  return scaled === 0 ? '—' : (scaled > 0 ? `+${scaled}` : `${scaled}`)
}

export default function DnaPreview({ current, predicted, deltas, loading }: Props) {
  const hasChange = DIMS.some(d => Math.abs(deltas[d]) >= 0.05)

  return (
    <section aria-labelledby="dna-preview-title" className="rounded-2xl bg-ns-surface-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="dna-preview-title" className="font-heading text-lg font-bold text-ns-text">DNA Preview</h3>
        {loading && <span className="animate-pulse text-sm text-ns-muted">Calculating…</span>}
        {!loading && !hasChange && <span className="text-sm text-ns-muted">No change</span>}
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {DIMS.map(dim => {
          const cur     = current[dim]
          const pred    = predicted[dim]
          const d       = deltas[dim]
          const pct     = (cur / 10) * 100
          const predPct = (pred / 10) * 100
          const isUp    = d >= 0.05
          const isDown  = d <= -0.05
          const tone    = isUp ? 'text-ns-success' : isDown ? 'text-ns-danger' : 'text-ns-muted'

          return (
            <div key={dim}>
              <div className="mb-1.5 flex items-baseline gap-2 text-sm tabular-nums">
                <span className="flex-1 font-semibold text-ns-text">{DNA_LABELS[dim]}</span>
                <span className="text-ns-muted">{fmt(cur)}</span>
                <span aria-hidden="true" className="text-ns-muted">→</span>
                <span className={cn('w-6 text-right font-semibold', tone)}>{loading ? '—' : fmt(pred)}</span>
                <span className={cn('w-8 text-right', loading ? 'text-ns-muted' : tone)}>{loading ? '' : fmtDelta(d)}</span>
              </div>

              <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
                {!loading && hasChange && (
                  <div
                    style={{ transform: `translateX(${predPct - 100}%)` }}
                    className={cn(
                      'absolute inset-0 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                      isUp ? 'bg-ns-success' : isDown ? 'bg-ns-danger' : 'bg-ns-muted',
                    )}
                  />
                )}
                <div
                  style={{ transform: `translateX(${Math.min(pct, !loading && hasChange ? predPct : pct) - 100}%)` }}
                  className="absolute inset-0 rounded-full bg-ns-muted transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ns-muted">
        Your Top 5 contributes 35% of your Movie DNA.
        Final scores blend with your ratings and taste history.
      </p>
    </section>
  )
}
