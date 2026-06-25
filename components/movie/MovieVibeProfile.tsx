'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
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
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Movie Vibe</p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#1C1C2E" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#52506A', fontSize: 10, fontFamily: 'var(--font-inter)' }}
          />
          <Radar dataKey="value" stroke="#C8963E" fill="#C8963E" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip
            contentStyle={{ background: '#0C0C18', border: '1px solid #1C1C2E', borderRadius: '8px', color: '#EDE9E1', fontSize: '12px' }}
            formatter={(v: number) => [v.toFixed(1), '']}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-ns-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ns-gold/70 rounded-full"
                style={{ width: `${(scores[key] / 10) * 100}%` }}
              />
            </div>
            <span className="text-ns-muted text-[10px] font-body w-16">{label}</span>
            <span className="text-ns-gold text-[10px] font-body w-4 text-right">{scores[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
