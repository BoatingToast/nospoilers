'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { FACETS, FACET_LABELS, type Facets } from '@/lib/audience-engine'

export async function audienceRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const data = await response.json()
  if (!response.ok)
    throw new Error(data.error || 'Could not complete this request. Please try again.')
  return data as T
}

export function useAudienceData<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    audienceRequest<T>(url, { signal: controller.signal })
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Could not load audience data.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [url, revision])
  return { data, error, loading, reload }
}

export function DataState({
  error,
  loading,
  retry,
}: {
  error: string
  loading: boolean
  retry: () => void
}) {
  if (error)
    return (
      <div role="alert" className="rounded-2xl bg-ns-danger/10 p-6">
        <p className="text-base text-ns-danger">{error}</p>
        <Button variant="outline" onClick={retry} className="mt-4">
          Try again
        </Button>
      </div>
    )
  if (loading)
    return (
      <div role="status" className="space-y-4 rounded-2xl bg-ns-surface p-6">
        <p className="text-base text-ns-muted">Loading audience data…</p>
        <div
          aria-hidden="true"
          className="h-32 rounded-xl bg-ns-surface-2 motion-safe:animate-pulse"
        />
      </div>
    )
  return null
}

export function Stat({
  label,
  value,
  detail,
  tint = false,
}: {
  label: string
  value: React.ReactNode
  detail?: string
  tint?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl p-5 sm:p-6 ${tint ? 'bg-ns-tile-lilac' : 'bg-ns-surface'}`}
    >
      <p className="text-sm font-semibold text-ns-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums text-ns-text sm:text-4xl">{value}</p>
      {detail && <p className="mt-2 text-sm leading-relaxed text-ns-muted">{detail}</p>}
    </div>
  )
}

export function Status({ value }: { value: string }) {
  const tone = ['active', 'accepted', 'valid'].includes(value)
    ? 'bg-ns-success/10 text-ns-success'
    : ['excluded', 'invalidated'].includes(value)
      ? 'bg-ns-danger/10 text-ns-danger'
      : 'bg-ns-surface-2 text-ns-muted'
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize ${tone}`}>
      {value}
    </span>
  )
}

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="min-w-0 rounded-2xl bg-ns-surface p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-ns-text">{title}</h2>
          {description && (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Distribution({
  rows,
  empty = 'No observations collected yet.',
}: {
  rows: Array<{ label: string; count: number }>
  empty?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (!rows.length) return <p className="text-base text-ns-muted">{empty}</p>
  return (
    <dl className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <dt className="capitalize text-ns-muted">{row.label.replaceAll('_', ' ')}</dt>
            <dd className="font-semibold tabular-nums text-ns-text">
              {row.count.toLocaleString()}
            </dd>
          </div>
          <div className="h-2 rounded-full bg-ns-surface-2">
            <div
              className="h-full rounded-full bg-ns-chart-1"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </dl>
  )
}

export function Trend({
  rows,
  label = 'Events',
}: {
  rows: Array<{ day: string; value: number }>
  label?: string
}) {
  if (!rows.length)
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl bg-ns-surface-2 px-6 text-center text-base text-ns-muted">
        The trend will appear as real responses arrive.
      </div>
    )
  const max = Math.max(1, ...rows.map((r) => r.value))
  const points = rows.map(
    (row, i) =>
      `${40 + (rows.length === 1 ? 355 : (i / (rows.length - 1)) * 710)},${160 - (row.value / max) * 135}`,
  )
  return (
    <div>
      <svg
        role="img"
        aria-label={`${label} over time: ${rows.map((r) => `${r.day}: ${r.value}`).join(', ')}`}
        viewBox="0 0 800 200"
        className="w-full text-ns-chart-1"
      >
        <line x1="40" x2="750" y1="160" y2="160" className="stroke-ns-border" />
        <line x1="40" x2="750" y1="25" y2="25" className="stroke-ns-border" strokeDasharray="4 6" />
        <text x="0" y="30" className="fill-ns-muted" fontSize="14">
          {max}
        </text>
        <text x="12" y="165" className="fill-ns-muted" fontSize="14">
          0
        </text>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((point, i) => {
          const [cx, cy] = point.split(',')
          return (
            <circle key={rows[i].day} cx={cx} cy={cy} r="4" fill="currentColor">
              <title>
                {rows[i].day}: {rows[i].value}
              </title>
            </circle>
          )
        })}
        <text x="40" y="193" className="fill-ns-muted" fontSize="14">
          {rows[0].day}
        </text>
        <text x="750" y="193" textAnchor="end" className="fill-ns-muted" fontSize="14">
          {rows.at(-1)?.day}
        </text>
      </svg>
    </div>
  )
}

export function FacetInputs({
  value,
  onChange,
  prefix,
}: {
  value: Facets
  onChange: (value: Facets) => void
  prefix: string
}) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {FACETS.map((key) => (
        <div key={key}>
          <label
            htmlFor={`${prefix}-${key}`}
            className="flex justify-between gap-3 text-sm font-semibold text-ns-text"
          >
            {FACET_LABELS[key]}
            <span className="tabular-nums text-ns-muted">{value[key]} / 10</span>
          </label>
          <input
            id={`${prefix}-${key}`}
            type="range"
            min="1"
            max="10"
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })}
            className="mt-2 h-7 w-full accent-ns-secondary"
          />
        </div>
      ))}
    </div>
  )
}

export const fieldClass =
  'min-h-12 w-full rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-secondary'
export function percent(value: number | null | undefined) {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`
}
export function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
