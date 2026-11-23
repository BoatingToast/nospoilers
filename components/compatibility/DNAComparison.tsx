import type { DNAScores } from '@/types'
import type { CompatibilityResult } from '@/types'
import { CheckIcon } from '@/components/icons'
import { growOnReveal } from '@/components/profile/motion'

const DNA_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotional depth',
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

function Meter({ value, className, label }: { value: number; className: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ns-surface-3">
        <div
          className={`h-full rounded-full ${className} ${growOnReveal}`}
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-semibold tabular-nums text-ns-text">
        <span className="sr-only">{label}: </span>{value.toFixed(1)}
      </span>
    </div>
  )
}

export default function DNAComparison({ dnaDiff, yourUsername, theirUsername }: Props) {
  const keys = Object.keys(dnaDiff) as (keyof DNAScores)[]

  return (
    <section className="mt-12">
      <div className="ns-reveal flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Movie DNA comparison</h2>
        <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-1 text-sm text-ns-muted">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-ns-secondary" />
            <span className="truncate">@{yourUsername}</span>
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-ns-text" />
            <span className="truncate">@{theirUsername}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-x-10 rounded-2xl bg-ns-surface p-6 sm:p-8 md:grid-cols-2">
        {keys.map((key, index) => {
          const { you, them, diff } = dnaDiff[key]
          const agreement = Math.abs(diff) <= 1.5
          return (
            <div
              key={key}
              className="ns-reveal border-b border-ns-border py-4 last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
              style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-semibold text-ns-text">{DNA_LABELS[key]}</span>
                {agreement ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-ns-success">
                    <CheckIcon size={13} /> Aligned
                  </span>
                ) : (
                  <span className="text-sm tabular-nums text-ns-muted">
                    {diff > 0 ? `+${diff.toFixed(1)} you` : `${Math.abs(diff).toFixed(1)} them`}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <Meter value={you} className="bg-ns-secondary" label={`@${yourUsername}`} />
                <Meter value={them} className="bg-ns-text" label={`@${theirUsername}`} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
