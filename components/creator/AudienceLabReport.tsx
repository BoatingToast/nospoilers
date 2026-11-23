'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import Meter from '@/components/dashboard/Meter'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'
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

function Metric({ value, label, detail, tile, index }: { value: string; label: string; detail?: string; tile: string; index: number }) {
  return (
    <div className={`ns-reveal rounded-2xl p-6 print:break-inside-avoid ${tile}`} style={{ '--i': index } as React.CSSProperties}>
      <p className="font-display text-4xl tabular-nums text-ns-text sm:text-5xl">{value}</p>
      <p className="mt-3 font-heading text-base font-bold text-ns-text">{label}</p>
      {detail && <p className="mt-1 text-sm leading-relaxed text-ns-muted">{detail}</p>}
    </div>
  )
}

function BarRow({ label, value, percent, index }: { label: string; value: string; percent: number; index: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 font-semibold text-ns-text">{label}</span>
        <span className="flex-shrink-0 tabular-nums text-ns-muted">{value}</span>
      </div>
      <Meter value={percent} index={index} barClassName="bg-ns-chart-1" />
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Building your audience report…</span>
      <div aria-hidden="true">
        <Skeleton className="h-14 w-2/3 rounded-xl" />
        <Skeleton className="mt-4 h-5 w-1/2" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-40 rounded-2xl" />)}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {[0, 1].map(item => <Skeleton key={item} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
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

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Audience Lab</h1>
        <p role="alert" className="mt-4 text-lg leading-relaxed text-ns-muted">{error}</p>
        <Button variant="secondary" href="/creator" className="mt-6">
          <ArrowRightIcon size={15} className="rotate-180" /> Back to Creator Studio
        </Button>
      </div>
    )
  }
  if (!report) return <ReportSkeleton />
  const { insights } = report
  const tasteProfile = insights.tasteProfile

  return (
    <div className="pb-16 motion-safe:animate-[fadeUp_320ms_cubic-bezier(0.23,1,0.32,1)_backwards] print:max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/creator" className="-ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text">
          <ArrowRightIcon size={14} className="rotate-180" /> Creator Studio
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" href={`/theater/${report.id}`}>View screening</Button>
          <Button onClick={() => window.print()}>Save / print report</Button>
        </div>
      </div>

      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-12">
        <div className="min-w-0">
          <h1 className="font-display text-4xl text-ns-text [overflow-wrap:anywhere] sm:text-6xl">{report.title}</h1>
          <p className="mt-3 text-base text-ns-muted">
            {report.kind === 'film' ? 'Film screening' : 'Trailer test'} · {new Date(report.startsAt).toLocaleString()} · <span className="capitalize">{report.status}</span>
          </p>
        </div>
        <p className="text-sm leading-relaxed text-ns-muted">
          Use these signals as evidence, not a verdict. Responses are anonymous and taste data only appears for cohorts of at least three.
        </p>
      </header>

      <section aria-labelledby="market-proof-title" className="mt-10">
        <h2 id="market-proof-title" className="mb-4 font-display text-2xl text-ns-text sm:text-3xl">Market proof</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <Metric index={0} tile="bg-ns-tile-peach" value={`${insights.averageRating?.toFixed(1) ?? '—'} / 5`} label="Overall response" detail={`${insights.responseCount} verified viewers`} />
          <Metric index={1} tile="bg-ns-tile-blue" value={insights.averageRecommendScore === null ? '—' : `${insights.averageRecommendScore} / 10`} label="Recommend intent" />
          <Metric index={2} tile="bg-ns-tile-green" value={insights.strongRecommendRate === null ? '—' : `${insights.strongRecommendRate}%`} label="Strong advocates" detail="Scored recommendation intent 8–10" />
          <Metric index={3} tile="bg-ns-tile-lilac" value={insights.completionRate === null ? '—' : `${insights.completionRate}%`} label="Feedback completion" detail={`${insights.watchedCount} watched · ${report.reservedCount} reserved`} />
        </div>
      </section>

      {insights.takeaways.length > 0 && (
        <section aria-labelledby="takeaways-title" className="ns-reveal mt-6 rounded-2xl bg-ns-surface p-6 sm:p-8 print:break-inside-avoid">
          <h2 id="takeaways-title" className="font-heading text-xl font-bold text-ns-text">Signals worth discussing</h2>
          <ul className="mt-3 grid gap-x-10 md:grid-cols-2">
            {insights.takeaways.map(item => (
              <li key={item} className="flex gap-3 border-t border-ns-border py-3 text-base leading-relaxed text-ns-text">
                <CheckIcon size={16} className="mt-1 flex-shrink-0 text-ns-muted" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="pacing-title" className="ns-reveal rounded-2xl bg-ns-surface p-6 sm:p-8 print:break-inside-avoid">
          <h2 id="pacing-title" className="font-heading text-xl font-bold text-ns-text">Pacing signal</h2>
          <p className="mt-1 text-sm text-ns-muted">How the cut felt to verified viewers.</p>
          <div className="mt-6 space-y-5">
            {PACING_SIGNALS.map((signal, index) => {
              const count = insights.pacing[signal]
              const percent = pacingTotal ? Math.round(count / pacingTotal * 100) : 0
              return <BarRow key={signal} index={index} label={pacingLabel(signal)} value={`${count} · ${percent}%`} percent={percent} />
            })}
          </div>
          {!pacingTotal && <p className="mt-5 text-sm text-ns-muted">No pacing responses yet.</p>}
        </section>

        <section aria-labelledby="reaction-title" className="ns-reveal rounded-2xl bg-ns-surface p-6 sm:p-8 print:break-inside-avoid" style={{ '--i': 1 } as React.CSSProperties}>
          <h2 id="reaction-title" className="font-heading text-xl font-bold text-ns-text">Emotional footprint</h2>
          <p className="mt-1 text-sm text-ns-muted">The reactions viewers selected after the credits.</p>
          {insights.reactions.length ? (
            <div className="mt-6 space-y-5">
              {insights.reactions.map((item, index) => (
                <BarRow
                  key={item.reaction}
                  index={index}
                  label={reactionLabel(item.reaction)}
                  value={`${item.count} viewers · ${item.percentage}%`}
                  percent={item.percentage}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-ns-muted">No emotional reactions yet.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="audience-fit-title" className="ns-reveal mt-6 rounded-2xl bg-ns-surface p-6 sm:p-8 print:break-inside-avoid">
        <h2 id="audience-fit-title" className="font-heading text-xl font-bold text-ns-text">Audience taste fit</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ns-muted">
          An anonymous average of respondents’ established Movie DNA—not demographics or personal information. Use it to describe the audience most likely to connect with the film.
        </p>
        {tasteProfile ? (
          <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {tasteDimensions.map(([key, label], index) => (
              <BarRow key={key} index={index} label={label} value={tasteProfile[key].toFixed(1)} percent={tasteProfile[key] * 10} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-ns-surface-2 p-5 text-sm leading-relaxed text-ns-muted">
            Taste fit unlocks after at least three respondents with Movie DNA profiles, protecting individual audience privacy.
          </p>
        )}
      </section>

      <section aria-labelledby="notes-title" className="mt-10">
        <h2 id="notes-title" className="font-display text-2xl text-ns-text sm:text-3xl">Anonymous audience notes</h2>
        <p className="mt-1.5 text-base text-ns-muted">Read for repeated patterns. A single note is one perspective, not a mandate.</p>
        {insights.comments.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:gap-4">
            {insights.comments.map((comment, index) => (
              <blockquote
                key={`${comment.kind}-${index}`}
                className="ns-reveal rounded-2xl bg-ns-surface p-6 print:break-inside-avoid"
                style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
              >
                <p className={`text-sm font-semibold ${comment.kind === 'standout' ? 'text-ns-success' : 'text-ns-warning'}`}>
                  {comment.kind === 'standout' ? 'What stayed with them' : 'What could be stronger'}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ns-text [overflow-wrap:anywhere]">“{comment.text}”</p>
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-ns-surface p-6 text-base text-ns-muted">No written notes yet.</p>
        )}
      </section>

      <footer className="mt-10 border-t border-ns-border pt-5 text-sm leading-relaxed text-ns-muted">
        Generated by NoSpoilers Audience Labs. Viewer identities are not included. The filmmaker keeps ownership of their film and uses this report as supporting audience evidence.
      </footer>
    </div>
  )
}
