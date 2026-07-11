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
import { MovieDnaIcon } from '@/components/icons'
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
          className="h-full bg-gradient-to-r from-ns-secondary/60 to-ns-secondary rounded-full transition-all duration-700"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-ns-secondary text-xs font-body w-6 flex-shrink-0">{value}</span>
    </div>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl tracking-wider text-ns-text">MOVIE DNA</h2>
        <Badge variant="secondary" className="uppercase tracking-wider">Generated</Badge>
      </div>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <CardShell>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-ns-surface border border-ns-border rounded-2xl h-64" />
        <div className="bg-ns-surface border border-ns-border rounded-2xl h-64" />
      </div>
    </CardShell>
  )
}

function EmptyState({ username }: { username?: string }) {
  return (
    <div className="py-16 text-center">
      <MovieDnaIcon size={40} className="text-ns-secondary/40 mx-auto mb-3" />
      <p className="text-ns-muted font-body text-sm">
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
    { label: 'Tone',   value: tone   },
    ...(rewatchTendency ? [{ label: 'Rewatches', value: rewatchTendency }] : []),
  ]

  return (
    <CardShell>
      {/* Identity + summary */}
      <div className="mb-6">
        {identity && (
          <p className="font-display text-xl tracking-wider mb-1" style={{ color: identity.accentHex }}>
            {identity.name}
          </p>
        )}
        <p className="text-ns-muted text-sm font-body leading-relaxed">{summary}</p>
      </div>

      {/* Genres + trait pills */}
      {(topGenres.length > 0 || traitPills.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {topGenres.map(g => (
            <Badge key={g} variant="outline">{g}</Badge>
          ))}
          {traitPills.map(t => (
            <Badge key={t.label} variant="muted">{t.label}: {t.value}</Badge>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-6`}>

        {/* Radar chart */}
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-6 flex flex-col items-center">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Profile</p>
          <ResponsiveContainer width="100%" height={compact ? 200 : 240}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgb(var(--ns-border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'rgb(var(--ns-muted))', fontSize: 11, fontFamily: 'var(--font-inter)' }}
              />
              <Radar
                name="DNA"
                dataKey="value"
                stroke="rgb(var(--ns-secondary))"
                fill="rgb(var(--ns-secondary))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--ns-surface))',
                  border: '1px solid rgb(var(--ns-border))',
                  borderRadius: '8px',
                  color: 'rgb(var(--ns-text))',
                  fontSize: '12px',
                  fontFamily: 'var(--font-inter)',
                }}
                formatter={(v: number) => [v.toFixed(1), '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score bars */}
        {!compact && (
          <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
            <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-5">Breakdown</p>
            <div className="flex flex-col gap-4">
              {LABELS.map(({ key, label }) => (
                <ScoreBar key={key} label={label} value={scores[key]} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CardShell>
  )
}
