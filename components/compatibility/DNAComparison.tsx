import type { DNAScores } from '@/types'
import type { CompatibilityResult } from '@/types'
import Section from '@/components/ui/Section'

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
    <Section title="Movie DNA Comparison">
      {/* Legend */}
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 font-body text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2.5 w-2.5 flex-shrink-0 bg-ns-secondary" />
          <span className="text-ns-muted [overflow-wrap:anywhere]">@{yourUsername}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-2.5 w-2.5 flex-shrink-0 bg-violet-500" />
          <span className="text-ns-muted [overflow-wrap:anywhere]">@{theirUsername}</span>
        </div>
      </div>

      <div className="border-b border-ns-border">
        {keys.map(key => {
          const { you, them, diff } = dnaDiff[key]
          const agreement = Math.abs(diff) <= 1.5
          return (
            <div key={key} className="border-t border-ns-border py-3">
              <div className="mb-1.5 flex justify-between gap-3">
                <span className="font-body text-sm text-ns-text">{DNA_LABELS[key]}</span>
                {agreement ? (
                  <span className="font-body text-xs text-ns-success">✓ Aligned</span>
                ) : (
                  <span className="font-body text-xs text-ns-muted">
                    {diff > 0 ? `+${diff.toFixed(1)} you` : `${Math.abs(diff).toFixed(1)} them`}
                  </span>
                )}
              </div>

              {/* Dual bar */}
              <div className="relative h-2 overflow-hidden bg-ns-border">
                {/* Your bar */}
                <div
                  className="absolute left-0 top-0 h-full bg-ns-secondary opacity-90"
                  style={{ width: `${(you / 10) * 100}%` }}
                />
                {/* Their bar overlay (thinner, different color) */}
                <div
                  className="absolute left-0 top-0.5 h-1 bg-violet-500 opacity-70"
                  style={{ width: `${(them / 10) * 100}%` }}
                />
              </div>

              <div className="mt-1 flex justify-between">
                <span className="font-body text-[11px] text-ns-secondary-readable">{you.toFixed(1)}</span>
                <span className="font-body text-[11px] text-violet-400">{them.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
