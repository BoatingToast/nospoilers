'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import Meter from '@/components/dashboard/Meter'
import type { AudienceLabListItem } from '@/lib/audience-lab'

function screeningDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AudienceLabDashboard() {
  const [labs, setLabs] = useState<AudienceLabListItem[] | null>(null)
  const [error, setError] = useState('')
  const [needsAccess, setNeedsAccess] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/audience-labs', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json() as { labs?: AudienceLabListItem[]; error?: string }
      if (!response.ok) {
        if (response.status === 403) setNeedsAccess(true)
        throw new Error(body.error || 'Could not load Audience Labs.')
      }
      setLabs(body.labs ?? [])
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load Audience Labs.') })
    return () => controller.abort()
  }, [])

  return (
    <section id="audience-labs" aria-labelledby="audience-labs-title" className="scroll-mt-28 rounded-2xl bg-ns-surface p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="audience-labs-title" className="font-display text-3xl text-ns-text">Audience Labs</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">
            Turn every Theater screening into anonymous market proof: recommendation intent, pacing, emotion, audience fit, and actionable notes.
          </p>
        </div>
        <Button variant="outline" href="/theater/new" className="flex-shrink-0 self-start hover:bg-ns-surface-2">
          Start a screening lab
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-ns-surface-2 p-5 motion-safe:animate-fade-up">
          <p className="text-base leading-relaxed text-ns-muted">{error}</p>
          {needsAccess && (
            <Button variant="secondary" href="/pro/access" className="mt-3 bg-ns-surface-3 hover:bg-ns-border-strong">
              Get NoSpoilers Pro access
            </Button>
          )}
        </div>
      )}

      {!error && labs === null && (
        <div role="status" className="mt-6">
          <span className="sr-only">Loading your audience research…</span>
          <div aria-hidden="true" className="space-y-3">
            {[0, 1].map(row => <Skeleton key={row} className="h-28 rounded-xl bg-ns-surface-2" />)}
          </div>
        </div>
      )}

      {labs?.length === 0 && (
        <div className="mt-6 rounded-xl bg-ns-surface-2 p-6 motion-safe:animate-fade-up">
          <p className="font-heading text-lg font-bold text-ns-text">Your first audience is waiting.</p>
          <p className="mt-1 max-w-xl text-base leading-relaxed text-ns-muted">
            Host a film or trailer in Theater. Viewers receive Audience XP for private feedback, and your results appear here.
          </p>
        </div>
      )}

      {labs && labs.length > 0 && (
        <ul className="mt-6 divide-y divide-ns-border">
          {labs.map((lab, index) => {
            const turnout = lab.reservedCount > 0 ? (lab.watchedCount / lab.reservedCount) * 100 : 0
            return (
              <li key={lab.id} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
                <Link href={`/creator/labs/${lab.id}`} className="group -mx-3 block rounded-xl p-3 transition-colors duration-150 hover:bg-ns-surface-2 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-lg font-bold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">{lab.title}</h3>
                      <p className="mt-0.5 text-sm text-ns-muted">{screeningDate(lab.startsAt)}</p>
                    </div>
                    <Badge variant={lab.status === 'live' ? 'success' : 'muted'} className="flex-shrink-0 capitalize">
                      {lab.kind} · {lab.status}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid grid-cols-4 gap-3">
                    {[
                      ['Reserved', lab.reservedCount],
                      ['Watched', lab.watchedCount],
                      [lab.responseCount === 1 ? 'Response' : 'Responses', lab.responseCount],
                      ['Overall', lab.averageRating?.toFixed(1) ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dd className="font-display text-xl tabular-nums text-ns-text sm:text-2xl">{value}</dd>
                        <dt className="truncate text-xs text-ns-muted sm:text-sm">{label}</dt>
                      </div>
                    ))}
                  </dl>

                  {lab.reservedCount > 0 && lab.status !== 'upcoming' && (
                    <div className="mt-3">
                      <Meter value={turnout} index={index} className="h-1.5" barClassName="bg-ns-chart-1" />
                      <p className="mt-1.5 text-sm tabular-nums text-ns-muted">{Math.round(turnout)}% of reservations watched</p>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
