'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PACING_SIGNALS, pacingLabel, reactionLabel, type AudienceLabReportData, type AudienceTasteSnapshot } from '@/lib/audience-lab'

const tasteDimensions: Array<[keyof AudienceTasteSnapshot, string]> = [
  ['emotionalImpactScore', 'Emotional stories'],
  ['suspenseScore', 'Suspense'],
  ['complexityScore', 'Complexity'],
  ['humorScore', 'Humor'],
  ['realismScore', 'Realism'],
  ['actionScore', 'Action'],
  ['darknessScore', 'Darker tone'],
]

function Metric({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return <div className="rounded-2xl border border-ns-border bg-ns-surface/55 p-5"><p className="font-display text-4xl tracking-wide text-ns-text">{value}</p><p className="mt-2 text-[10px] uppercase tracking-[.16em] text-ns-secondary-readable">{label}</p>{detail && <p className="mt-2 text-[11px] text-ns-muted">{detail}</p>}</div>
}

export default function AudienceLabReport({ id }: { id: string }) {
  const [report, setReport] = useState<AudienceLabReportData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/audience-labs/${id}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json() as AudienceLabReportData & { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not load this report.')
      setReport(body)
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load this report.') })
    return () => controller.abort()
  }, [id])

  const pacingTotal = useMemo(() => report ? Object.values(report.insights.pacing).reduce((sum, value) => sum + value, 0) : 0, [report])

  if (error) return <div className="mx-auto max-w-3xl py-16 text-center"><h1 className="font-display text-4xl tracking-wide text-ns-text">AUDIENCE LAB</h1><p role="alert" className="mt-5 text-sm text-ns-muted">{error}</p><Link href="/creator" className="mt-6 inline-block text-sm text-ns-secondary-readable">← Back to Creator Studio</Link></div>
  if (!report) return <p role="status" className="py-24 text-center text-sm text-ns-muted">Building your audience report…</p>
  const { insights } = report

  return <div className="mx-auto max-w-6xl pb-16 print:max-w-none">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4 print:hidden"><Link href="/creator" className="text-xs text-ns-muted hover:text-ns-secondary-readable">← Creator Studio</Link><div className="flex gap-2"><Link href={`/theater/${report.id}`} className="rounded-xl border border-ns-border px-4 py-3 text-xs text-ns-text">View screening</Link><button onClick={() => window.print()} className="rounded-xl bg-ns-secondary px-4 py-3 text-xs font-semibold text-white">Save / print report</button></div></div>

    <header className="border-b border-ns-border pb-8"><p className="text-[10px] uppercase tracking-[.22em] text-ns-secondary-readable">NoSpoilers Audience Lab · Private report</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-4xl tracking-wider text-ns-text sm:text-6xl">{report.title}</h1><p className="mt-3 text-sm text-ns-muted">{report.kind === 'film' ? 'Film screening' : 'Trailer test'} · {new Date(report.startsAt).toLocaleString()} · {report.status}</p></div><p className="max-w-sm text-right text-xs leading-5 text-ns-muted">Use these signals as evidence, not a verdict. Responses are anonymous and taste data only appears for cohorts of at least three.</p></div></header>

    <section aria-labelledby="market-proof-title" className="mt-8"><div className="mb-4"><p className="text-[10px] uppercase tracking-[.18em] text-ns-secondary-readable">Distribution & pitch evidence</p><h2 id="market-proof-title" className="mt-1 font-heading text-xl font-semibold text-ns-text">Market proof</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric value={`${insights.averageRating?.toFixed(1) ?? '—'} / 5`} label="Overall response" detail={`${insights.responseCount} verified viewers`} /><Metric value={insights.averageRecommendScore === null ? '—' : `${insights.averageRecommendScore} / 10`} label="Recommend intent" /><Metric value={insights.strongRecommendRate === null ? '—' : `${insights.strongRecommendRate}%`} label="Strong advocates" detail="Scored recommendation intent 8–10" /><Metric value={insights.completionRate === null ? '—' : `${insights.completionRate}%`} label="Feedback completion" detail={`${insights.watchedCount} watched · ${report.reservedCount} reserved`} /></div></section>

    {insights.takeaways.length > 0 && <section className="mt-8 rounded-2xl border border-[#ddbd86]/25 bg-[#ddbd86]/5 p-6"><p className="text-[10px] uppercase tracking-[.18em] text-[#b88b41] dark:text-[#ddbd86]">Signals worth discussing</p><ul className="mt-4 grid gap-3 md:grid-cols-2">{insights.takeaways.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-ns-text"><span className="text-[#b88b41] dark:text-[#ddbd86]">✦</span>{item}</li>)}</ul></section>}

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="pacing-title" className="rounded-2xl border border-ns-border bg-ns-surface/55 p-6"><h2 id="pacing-title" className="font-heading text-lg font-semibold text-ns-text">Pacing signal</h2><p className="mt-2 text-xs text-ns-muted">How the cut felt to verified viewers.</p><div className="mt-6 space-y-4">{PACING_SIGNALS.map(signal => { const count = insights.pacing[signal]; const percent = pacingTotal ? Math.round(count / pacingTotal * 100) : 0; return <div key={signal}><div className="mb-2 flex justify-between text-xs"><span className="text-ns-text">{pacingLabel(signal)}</span><span className="text-ns-muted">{count} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-ns-border"><div className="h-full rounded-full bg-ns-secondary" style={{ width: `${percent}%` }} /></div></div> })}</div>{!pacingTotal && <p className="mt-5 text-xs text-ns-muted">No pacing responses yet.</p>}</section>

      <section aria-labelledby="reaction-title" className="rounded-2xl border border-ns-border bg-ns-surface/55 p-6"><h2 id="reaction-title" className="font-heading text-lg font-semibold text-ns-text">Emotional footprint</h2><p className="mt-2 text-xs text-ns-muted">The reactions viewers selected after the credits.</p>{insights.reactions.length ? <div className="mt-6 flex flex-wrap gap-3">{insights.reactions.map(item => <div key={item.reaction} className="rounded-xl border border-ns-border bg-ns-bg/45 px-4 py-3"><p className="text-sm font-semibold text-ns-text">{reactionLabel(item.reaction)}</p><p className="mt-1 text-[10px] text-ns-muted">{item.count} viewers · {item.percentage}%</p></div>)}</div> : <p className="mt-5 text-xs text-ns-muted">No emotional reactions yet.</p>}</section>
    </div>

    <section aria-labelledby="audience-fit-title" className="mt-8 rounded-2xl border border-ns-border bg-ns-surface/55 p-6"><div><p className="text-[10px] uppercase tracking-[.18em] text-ns-secondary-readable">Who connected</p><h2 id="audience-fit-title" className="mt-1 font-heading text-lg font-semibold text-ns-text">Audience taste fit</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-ns-muted">An anonymous average of respondents’ established Movie DNA—not demographics or personal information. Use it to describe the audience most likely to connect with the film.</p></div>{insights.tasteProfile ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tasteDimensions.map(([key, label]) => <div key={key}><div className="mb-2 flex justify-between text-xs"><span className="text-ns-text">{label}</span><span className="text-ns-muted">{insights.tasteProfile![key].toFixed(1)}</span></div><div className="h-2 overflow-hidden rounded-full bg-ns-border"><div className="h-full rounded-full bg-gradient-to-r from-ns-secondary to-amber-400" style={{ width: `${insights.tasteProfile![key] * 10}%` }} /></div></div>)}</div> : <p className="mt-6 rounded-xl border border-dashed border-ns-border p-5 text-xs leading-5 text-ns-muted">Taste fit unlocks after at least three respondents with Movie DNA profiles, protecting individual audience privacy.</p>}</section>

    <section aria-labelledby="notes-title" className="mt-8"><h2 id="notes-title" className="font-heading text-lg font-semibold text-ns-text">Anonymous audience notes</h2><p className="mt-2 text-xs text-ns-muted">Read for repeated patterns. A single note is one perspective, not a mandate.</p>{insights.comments.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{insights.comments.map((comment, index) => <blockquote key={`${comment.kind}-${index}`} className="rounded-2xl border border-ns-border bg-ns-surface/55 p-5"><p className={`text-[9px] uppercase tracking-[.16em] ${comment.kind === 'standout' ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{comment.kind === 'standout' ? 'What stayed with them' : 'What could be stronger'}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ns-text">“{comment.text}”</p></blockquote>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-ns-border p-5 text-xs text-ns-muted">No written notes yet.</p>}</section>

    <footer className="mt-10 border-t border-ns-border pt-5 text-[10px] leading-5 text-ns-muted">Generated by NoSpoilers Audience Labs. Viewer identities are not included. The filmmaker keeps ownership of their film and uses this report as supporting audience evidence.</footer>
  </div>
}
