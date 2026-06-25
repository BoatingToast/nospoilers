'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { DNAScores } from '@/types'

interface MovieDNACardProps {
  scores: DNAScores
}

const LABELS: { key: keyof DNAScores; label: string }[] = [
  { key: 'suspenseScore',        label: 'Suspense'  },
  { key: 'emotionalImpactScore', label: 'Emotion'   },
  { key: 'complexityScore',      label: 'Complexity'},
  { key: 'humorScore',           label: 'Humor'     },
  { key: 'realismScore',         label: 'Realism'   },
  { key: 'actionScore',          label: 'Action'    },
  { key: 'darknessScore',        label: 'Darkness'  },
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ns-muted text-xs font-body w-20 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-ns-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-ns-gold/60 to-ns-gold rounded-full transition-all duration-700"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-ns-gold text-xs font-body w-6 flex-shrink-0">{value}</span>
    </div>
  )
}

export default function MovieDNACard({ scores }: MovieDNACardProps) {
  const radarData = LABELS.map(({ key, label }) => ({
    dimension: label,
    value:     scores[key],
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl tracking-wider text-ns-text">MOVIE DNA</h2>
        <span className="px-2 py-0.5 rounded-full bg-ns-gold/10 border border-ns-gold/20
                         text-ns-gold text-xs font-body tracking-wider uppercase">
          Generated
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Radar chart */}
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-6 flex flex-col items-center">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Profile</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1C1C2E" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#52506A', fontSize: 11, fontFamily: 'var(--font-inter)' }}
              />
              <Radar
                name="DNA"
                dataKey="value"
                stroke="#C8963E"
                fill="#C8963E"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: '#0C0C18',
                  border: '1px solid #1C1C2E',
                  borderRadius: '8px',
                  color: '#EDE9E1',
                  fontSize: '12px',
                  fontFamily: 'var(--font-inter)',
                }}
                formatter={(v: number) => [v.toFixed(1), '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score bars */}
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-5">Breakdown</p>
          <div className="flex flex-col gap-4">
            {LABELS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={scores[key]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
