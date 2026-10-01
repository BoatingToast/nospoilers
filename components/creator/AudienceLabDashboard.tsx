'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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

  return <section id="audience-labs" aria-labelledby="audience-labs-title" className="mb-8 scroll-mt-28 rounded-2xl border border-[#ddbd86]/25 bg-[linear-gradient(135deg,rgba(221,189,134,.08),rgba(124,92,191,.05))] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-body uppercase tracking-[0.22em] text-[#ddbd86]">Filmmaker research</p><h2 id="audience-labs-title" className="mt-2 font-heading text-xl font-semibold text-ns-text">Audience Labs</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ns-muted">Turn every Theater screening into anonymous market proof: recommendation intent, pacing, emotion, audience fit, and actionable notes.</p></div>
      <Link href="/theater/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ddbd86] px-5 text-xs font-semibold text-[#211a12] transition-colors hover:bg-[#efd4a6]">Start a screening lab</Link>
    </div>

    {error && <div className="mt-5 rounded-xl border border-ns-border bg-ns-bg/50 p-4"><p className="text-xs leading-6 text-ns-muted">{error}</p>{needsAccess && <Link href="/pro/access" className="mt-3 inline-block text-xs font-semibold text-ns-secondary-readable">Get NoSpoilers Pro access →</Link>}</div>}
    {!error && labs === null && <p role="status" className="mt-5 text-xs text-ns-muted">Loading your audience research…</p>}
    {labs?.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-ns-border p-5 text-center"><p className="text-sm text-ns-text">Your first audience is waiting.</p><p className="mt-2 text-xs leading-5 text-ns-muted">Host a film or trailer in Theater. Viewers receive Audience XP for private feedback, and your results appear here.</p></div>}
    {labs && labs.length > 0 && <div className="mt-6 grid gap-3 lg:grid-cols-2">{labs.map(lab => <Link key={lab.id} href={`/creator/labs/${lab.id}`} className="group rounded-xl border border-ns-border bg-ns-bg/45 p-4 transition-colors hover:border-[#ddbd86]/45">
      <div className="flex items-center justify-between gap-3"><p className="text-[9px] uppercase tracking-[.18em] text-[#ddbd86]">{lab.kind} · {lab.status}</p><span className="text-[10px] text-ns-muted">{lab.responseCount} response{lab.responseCount === 1 ? '' : 's'}</span></div>
      <h3 className="mt-3 truncate font-heading text-base font-semibold text-ns-text group-hover:text-[#ddbd86]">{lab.title}</h3>
      <p className="mt-2 text-[11px] text-ns-muted">{screeningDate(lab.startsAt)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ns-border pt-3 text-center"><div><p className="text-base font-semibold text-ns-text">{lab.reservedCount}</p><p className="text-[9px] uppercase tracking-wide text-ns-muted">Reserved</p></div><div><p className="text-base font-semibold text-ns-text">{lab.watchedCount}</p><p className="text-[9px] uppercase tracking-wide text-ns-muted">Watched</p></div><div><p className="text-base font-semibold text-ns-text">{lab.averageRating?.toFixed(1) ?? '—'}</p><p className="text-[9px] uppercase tracking-wide text-ns-muted">Overall</p></div></div>
    </Link>)}</div>}
  </section>
}
