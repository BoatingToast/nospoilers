import type { DNAScores } from '@/types'
import type { CompatibilityResult } from '@/types'

const DNA_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotional Depth',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

interface Props {
  dnaDiff:        CompatibilityResult['dnaDiff']
  yourUsername:   string
  theirUsername:  string
}

export default function DNAComparison({ dnaDiff, yourUsername, theirUsername }: Props) {
  const keys = Object.keys(dnaDiff) as (keyof DNAScores)[]

  return (
    <div className="mt-8 bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-6">
        Movie DNA Comparison
      </p>

      {/* Legend */}
      <div className="flex gap-6 mb-5 text-xs font-body">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ns-gold" />
          <span className="text-ns-muted">@{yourUsername}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-ns-muted">@{theirUsername}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {keys.map(key => {
          const { you, them, diff } = dnaDiff[key]
          const agreement = Math.abs(diff) <= 1.5
          return (
            <div key={key}>
              <div className="flex justify-between mb-1.5">
                <span className="text-ns-muted text-xs font-body">{DNA_LABELS[key]}</span>
                {agreement ? (
                  <span className="text-emerald-500 text-[10px] font-body">✓ Aligned</span>
                ) : (
                  <span className="text-ns-muted/50 text-[10px] font-body">
                    {diff > 0 ? `+${diff.toFixed(1)} you` : `${Math.abs(diff).toFixed(1)} them`}
                  </span>
                )}
              </div>

              {/* Dual bar */}
              <div className="relative h-2 bg-ns-border rounded-full overflow-hidden">
                {/* Your bar */}
                <div
                  className="absolute left-0 top-0 h-full bg-ns-gold rounded-full opacity-90"
                  style={{ width: `${(you / 10) * 100}%` }}
                />
                {/* Their bar overlay (thinner, different color) */}
                <div
                  className="absolute left-0 top-0.5 h-1 bg-violet-500 rounded-full opacity-70"
                  style={{ width: `${(them / 10) * 100}%` }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-ns-gold text-[10px] font-body">{you.toFixed(1)}</span>
                <span className="text-violet-400 text-[10px] font-body">{them.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
