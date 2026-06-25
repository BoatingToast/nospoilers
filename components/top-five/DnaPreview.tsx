'use client'

import type { DNAScores } from '@/types'
import {
  MovieDnaIcon,
  SuspenseIcon,
  EmotionIcon,
  ComplexityIcon,
  HumorIcon,
  RealismIcon,
  ActionIcon,
  DarknessIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  current:   DNAScores
  predicted: DNAScores
  deltas:    Record<keyof DNAScores, number>
  loading:   boolean
}

const DNA_LABELS: Record<keyof DNAScores, { label: string; Icon: React.ComponentType<IconProps> }> = {
  suspenseScore:        { label: 'Suspense',   Icon: SuspenseIcon   },
  emotionalImpactScore: { label: 'Emotion',    Icon: EmotionIcon    },
  complexityScore:      { label: 'Complexity', Icon: ComplexityIcon },
  humorScore:           { label: 'Humor',      Icon: HumorIcon      },
  realismScore:         { label: 'Realism',    Icon: RealismIcon    },
  actionScore:          { label: 'Action',     Icon: ActionIcon     },
  darknessScore:        { label: 'Darkness',   Icon: DarknessIcon   },
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
    <div className="rounded-2xl bg-ns-surface border border-ns-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ns-border flex items-center gap-2">
        <MovieDnaIcon size={16} className="text-ns-gold flex-shrink-0" />
        <h3 className="font-heading font-semibold text-white text-sm">DNA Preview</h3>
        {loading && (
          <span className="ml-auto text-xs font-body text-ns-muted animate-pulse">Calculating…</span>
        )}
        {!loading && !hasChange && (
          <span className="ml-auto text-xs font-body text-ns-muted">No change</span>
        )}
      </div>

      {/* Dimension rows */}
      <div className="p-4 space-y-3">
        {DIMS.map(dim => {
          const { label, Icon } = DNA_LABELS[dim]
          const cur     = current[dim]
          const pred    = predicted[dim]
          const d       = deltas[dim]
          const pct     = (cur / 10) * 100
          const predPct = (pred / 10) * 100
          const isUp    = d >= 0.05
          const isDown  = d <= -0.05

          return (
            <div key={dim}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className="text-ns-gold/70 flex-shrink-0" />
                <span className="text-xs font-heading font-medium text-white flex-1">{label}</span>
                {/* Current value */}
                <span className="text-xs font-body text-ns-muted w-7 text-right">{fmt(cur)}</span>
                {/* Arrow */}
                <span className="text-ns-muted text-xs">→</span>
                {/* Predicted value */}
                <span className={`text-xs font-heading font-semibold w-7 text-right ${
                  isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-ns-muted'
                }`}>
                  {loading ? '—' : fmt(pred)}
                </span>
                {/* Delta pill */}
                <span className={`text-[10px] font-body w-8 text-right ${
                  loading ? 'text-ns-muted' :
                  isUp    ? 'text-emerald-400' :
                  isDown  ? 'text-rose-400'   :
                            'text-ns-muted'
                }`}>
                  {loading ? '' : fmtDelta(d)}
                </span>
              </div>

              {/* Bar */}
              <div className="h-1 bg-ns-border rounded-full overflow-visible relative">
                {/* Current */}
                <div
                  className="absolute h-full rounded-full bg-ns-gold/40 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                {/* Predicted overlay */}
                {!loading && hasChange && (
                  <div
                    className={`absolute h-full rounded-full transition-all duration-500 ${
                      isUp ? 'bg-emerald-400/60' : isDown ? 'bg-rose-400/60' : 'bg-ns-gold/40'
                    }`}
                    style={{ width: `${predPct}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div className="px-4 pb-3">
        <p className="text-[10px] font-body text-ns-muted leading-relaxed">
          Your Top 5 contributes 35% of your Movie DNA.
          Final scores blend with your ratings and taste history.
        </p>
      </div>
    </div>
  )
}
