'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import Section from '@/components/ui/Section'
import type { DNAScores } from '@/types'

const LABELS: { key: keyof DNAScores; label: string }[] = [
  { key: 'suspenseScore',        label: 'Suspense'  },
  { key: 'emotionalImpactScore', label: 'Emotion'   },
  { key: 'complexityScore',      label: 'Complexity'},
  { key: 'humorScore',           label: 'Humor'     },
  { key: 'realismScore',         label: 'Realism'   },
  { key: 'actionScore',          label: 'Action'    },
  { key: 'darknessScore',        label: 'Darkness'  },
]

export default function MovieVibeProfile({ scores }: { scores: DNAScores }) {
  const data = LABELS.map(({ key, label }) => ({ dimension: label, value: scores[key] }))

  return (
    <Section title="Movie Vibe">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgb(var(--ns-border))" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: 'rgb(var(--ns-muted))', fontSize: 11, fontFamily: 'var(--font-inter)' }}
          />
          <Radar dataKey="value" stroke="rgb(var(--ns-secondary))" fill="rgb(var(--ns-secondary))" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip
            contentStyle={{ background: 'rgb(var(--ns-surface))', border: '1px solid rgb(var(--ns-border))', borderRadius: '4px', color: 'rgb(var(--ns-text))', fontSize: '12px' }}
            formatter={(v: number) => [v.toFixed(1), '']}
          />
        </RadarChart>
      </ResponsiveContainer>
      <dl className="mt-2">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 border-t border-ns-border py-2">
            <dt className="w-24 flex-shrink-0 font-body text-xs text-ns-muted">{label}</dt>
            <dd className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-1 flex-1 overflow-hidden bg-ns-border" aria-hidden="true">
                <span
                  className="block h-full bg-ns-secondary/70"
                  style={{ width: `${(scores[key] / 10) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right font-body text-xs text-ns-secondary-readable">{scores[key]}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
