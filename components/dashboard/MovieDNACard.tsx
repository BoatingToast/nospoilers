'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import Badge from '@/components/ui/Badge'
import Meter from './Meter'
import type { DNAScores, MovieDnaProfile } from '@/types'

interface MovieDNACardProps {
  /** Full bundle for a user, or null if they genuinely have no DNA yet. */
  profile?:  MovieDnaProfile | null
  /** True while the profile is being fetched (client-fetch contexts only). */
  loading?:  boolean
  /** Condensed layout for tighter spaces (e.g. a dashboard overview teaser). */
  compact?:  boolean
  username?: string
}

const LABELS: { key: keyof DNAScores; label: string }[] = [
  { key: 'suspenseScore', label: 'Suspense'  },
  { key: 'emotionalImpactScore', label: 'Emotion'   },
  { key: 'complexityScore', label: 'Complexity'},
  { key: 'humorScore', label: 'Humor'     },
  { key: 'realismScore', label: 'Realism'   },
  { key: 'actionScore', label: 'Action'    },
  { key: 'darknessScore', label: 'Darkness'  },
]

function ScoreBar({ label, value, index }: { label: string; value: number; index: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ns-text">{label}</span>
        <span className="text-sm tabular-nums text-ns-muted">{value}</span>
      </div>
      <Meter value={(value / 10) * 100} index={index} />
    </div>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Movie DNA</h2>
        <Badge variant="secondary">Generated</Badge>
      </div>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <CardShell>
      <div aria-hidden="true" className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-64 rounded-2xl bg-ns-surface-2" />
        <div className="h-64 rounded-2xl bg-ns-surface-2" />
      </div>
    </CardShell>
  )
}

function EmptyState({ username }: { username?: string }) {
  return (
    <div className="py-12 text-center">
      <h2 className="font-heading text-2xl font-bold text-ns-text">Movie DNA</h2>
      <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-ns-muted">
        {username
          ? `@${username} hasn't rated any films yet.`
          : 'Rate a few films or set your Top 5 to generate your Movie DNA.'}
      </p>
    </div>
  )
}

export default function MovieDNACard({ profile, loading = false, compact = false, username }: MovieDNACardProps) {
  if (loading) return <Skeleton />
  if (!profile) return <EmptyState username={username} />

  const { scores, summary, identity, topGenres, favoriteDecades, pacing, tone, rewatchTendency } = profile

  const radarData = LABELS.map(({ key, label }) => ({
    dimension: label,
    value:     scores[key],
  }))

  const traitPills: { label: string; value: string }[] = [
    ...(favoriteDecades.length > 0 ? [{ label: 'Decades', value: favoriteDecades.join(', ') }] : []),
    { label: 'Pacing', value: pacing },
    { label: 'Tone', value: tone   },
    ...(rewatchTendency ? [{ label: 'Rewatches', value: rewatchTendency }] : []),
  ]

  return (
    <CardShell>
      <div className="mb-6">
        {identity && (
          <p className="mb-1 font-display text-xl text-ns-secondary-readable sm:text-2xl">
            {identity.name}
          </p>
        )}
        <p className="max-w-2xl text-base leading-relaxed text-ns-muted">{summary}</p>
      </div>

      {(topGenres.length > 0 || traitPills.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {topGenres.map(g => (
            <Badge key={g} variant="outline" size="md">{g}</Badge>
          ))}
          {traitPills.map(t => (
            <Badge key={t.label} variant="muted" size="md" className="max-w-full whitespace-normal">{t.label}: {t.value}</Badge>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <div className="flex min-w-0 flex-col rounded-2xl bg-ns-surface-2 p-5 sm:p-6">
          <h3 className="font-heading text-lg font-bold text-ns-text">Profile</h3>
          <ResponsiveContainer width="100%" height={compact ? 220 : 280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="rgb(var(--ns-border-strong))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'rgb(var(--ns-muted))', fontSize: 12 }}
              />
              <Radar
                name="DNA"
                dataKey="value"
                stroke="rgb(var(--ns-chart-1))"
                fill="rgb(var(--ns-chart-1))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--ns-surface-3))',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'rgb(var(--ns-text))',
                  fontSize: '13px',
                }}
                itemStyle={{ color: 'rgb(var(--ns-text))' }}
                labelStyle={{ color: 'rgb(var(--ns-muted))' }}
                formatter={(v: number) => [v.toFixed(1), '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {!compact && (
          <div className="min-w-0 rounded-2xl bg-ns-surface-2 p-5 sm:p-6">
            <h3 className="mb-5 font-heading text-lg font-bold text-ns-text">Breakdown</h3>
            <div className="flex flex-col gap-4">
              {LABELS.map(({ key, label }, index) => (
                <ScoreBar key={key} label={label} value={scores[key]} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CardShell>
  )
}
