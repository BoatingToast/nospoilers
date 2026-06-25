'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import type { DNAScores } from '@/types'

const DNA_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotional',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

interface Props {
  scores:   DNAScores
  username: string
}

export default function ProfileDNA({ scores, username }: Props) {
  const data = (Object.keys(DNA_LABELS) as (keyof DNAScores)[]).map(key => ({
    trait: DNA_LABELS[key],
    score: scores[key],
  }))

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">Movie DNA</p>
      <h3 className="text-ns-text font-body text-sm mb-6">@{username}&apos;s cinematic fingerprint</h3>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#1C1C2E" />
            <PolarAngleAxis
              dataKey="trait"
              tick={{ fill: '#52506A', fontSize: 11, fontFamily: 'var(--font-inter)' }}
            />
            <Radar
              dataKey="score"
              stroke="#C8963E"
              fill="#C8963E"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score bars */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {data.map(d => (
          <div key={d.trait}>
            <div className="flex justify-between mb-1">
              <span className="text-ns-muted text-[11px] font-body">{d.trait}</span>
              <span className="text-ns-gold text-[11px] font-body">{d.score.toFixed(1)}</span>
            </div>
            <div className="h-1 bg-ns-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ns-gold rounded-full transition-all duration-700"
                style={{ width: `${(d.score / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
