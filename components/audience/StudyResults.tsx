'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import type { StudyReport } from '@/lib/audience-types'
import { FACET_LABELS, type Facet } from '@/lib/audience-engine'
import {
  audienceRequest,
  DataState,
  dateLabel,
  Distribution,
  Panel,
  percent,
  Stat,
  Status,
  Trend,
  useAudienceData,
} from './Analytics'

export default function StudyResults({ id, admin = false }: { id: string; admin?: boolean }) {
  const { data, error, loading, reload } = useAudienceData<StudyReport>(
    `/api/${admin ? 'admin/' : ''}audience/projects/${id}`,
  )
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [actionError, setActionError] = useState('')
  async function status(value: string) {
    setBusy(true)
    setActionError('')
    setMessage('')
    try {
      await audienceRequest(`/api/audience/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: value }),
      })
      reload()
      setMessage(
        value === 'active'
          ? 'Study is live. Share the invitation link to collect responses.'
          : `Study ${value}.`,
      )
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update study.')
    } finally {
      setBusy(false)
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/audience/${data?.project.shareCode}`,
      )
      setMessage('Invitation link copied.')
    } catch {
      setActionError('Could not copy automatically. Select and copy the invitation link below.')
    }
  }
  return (
    <div className="space-y-7">
      <Button href={admin ? '/admin' : '/creator/audience'} variant="ghost">
        {admin ? 'Admin workspace' : 'All audience studies'}
      </Button>
      <DataState error={error} loading={loading && !data} retry={reload} />
      {data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <PageHeader
              title={data.project.title}
              description={`${data.project.mediaType} study · Created ${dateLabel(data.project.createdAt)}`}
            />
            <Status value={data.project.status} />
          </div>
          <div className="flex flex-wrap gap-3">
            {!admin && data.project.status !== 'completed' && (
              <Button
                onClick={() => status(data.project.status === 'active' ? 'paused' : 'active')}
                loading={busy}
              >
                {data.project.status === 'active'
                  ? 'Pause collection'
                  : data.project.status === 'draft'
                    ? 'Launch study'
                    : 'Resume collection'}
              </Button>
            )}
            {!admin && data.project.status !== 'draft' && (
              <Button variant="outline" onClick={copyInvite}>
                Copy invitation link
              </Button>
            )}
            {!admin && (
              <Button variant="outline" href={`/api/audience/projects/${id}/export`}>
                Export aggregate CSV
              </Button>
            )}
            <Button variant="ghost" onClick={reload}>
              Refresh results
            </Button>
          </div>
          {message && (
            <p role="status" className="text-base text-ns-success">
              {message}
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-base text-ns-danger">
              {actionError}
            </p>
          )}
          {!admin && data.project.status !== 'draft' && (
            <p className="break-all text-sm text-ns-muted">
              Invitation:{' '}
              <a
                className="text-ns-secondary-readable underline"
                href={`/audience/${data.project.shareCode}`}
              >
                {typeof window !== 'undefined' ? window.location.origin : ''}/audience/
                {data.project.shareCode}
              </a>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Assigned participants"
              value={data.totals.assigned.toLocaleString()}
              detail="Consented, unique members"
            />
            <Stat
              label="Preview exposures"
              value={data.totals.exposed.toLocaleString()}
              detail="Preview opened in the browser"
            />
            <Stat
              label="Expressed interest"
              value={data.totals.interested.toLocaleString()}
              detail={`${percent(data.totals.exposed ? data.totals.interested / data.totals.exposed : null)} of exposed participants`}
              tint
            />
            <Stat
              label="Feedback responses"
              value={data.totals.responses.toLocaleString()}
              detail={`${data.quality.pending ?? 0} pending quality review`}
            />
          </div>
          <Panel title="Preview comparison" description={data.comparison}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Unique participants per preview variant. Interest includes a 95% Wilson interval.
                </caption>
                <thead className="text-ns-muted">
                  <tr>
                    {[
                      'Preview',
                      'Assigned',
                      'Exposed',
                      'Started',
                      'Reached 90%',
                      'Interest',
                      '95% interval',
                      'Rating / 5',
                    ].map((h) => (
                      <th key={h} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ns-border text-ns-text">
                  {data.variants.map((v) => (
                    <tr key={v.id}>
                      <th scope="row" className="px-3 py-4 font-semibold">
                        {v.label}
                      </th>
                      {[
                        v.assigned,
                        v.exposed,
                        v.started,
                        v.completed,
                        percent(v.interestRate.rate),
                        v.interestRate.low == null
                          ? '—'
                          : `${percent(v.interestRate.low)}–${percent(v.interestRate.high)}`,
                        v.rating?.toFixed(1) ?? '—',
                      ].map((value, i) => (
                        <td key={i} className="whitespace-nowrap px-3 py-4 tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ns-muted">
              Interest means a participant selected “I’m interested.” Video progress is
              browser-reported. Text previews have no playback percentage. Averages require at least
              five responses per variant.
            </p>
          </Panel>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Participation over time"
              description="Participants by enrollment date, in UTC."
            >
              <Trend
                rows={data.daily.map((d) => ({ day: d.day, value: d.participants }))}
                label="Participants"
              />
            </Panel>
            <Panel
              title="Research funnel"
              description="Unique participants, excluding quality-excluded responses."
            >
              <Distribution
                rows={[
                  { label: 'Assigned', count: data.totals.assigned },
                  { label: 'Exposed', count: data.totals.exposed },
                  { label: 'Started', count: data.totals.started },
                  { label: 'Feedback', count: data.totals.responses },
                ]}
              />
            </Panel>
          </div>
          <Panel
            title="Who is responding?"
            description={`Groups appear after ${data.minCohortSize} participants. These are observed associations, with no claim of representative market reach.`}
          >
            {!data.cohorts.length ? (
              <p className="text-base text-ns-muted">
                More participants are needed before cohort results can be shown.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-ns-muted">
                    <tr>
                      {[
                        'Dimension',
                        'Group',
                        'Participants',
                        'Exposed',
                        'Interest rate',
                        'Rating / 5',
                      ].map((h) => (
                        <th key={h} className="px-3 py-3 font-semibold" scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ns-border text-ns-text">
                    {data.cohorts.map((c) => (
                      <tr key={`${c.dimension}-${c.label}`}>
                        <td className="px-3 py-4 capitalize">{c.dimension}</td>
                        <th scope="row" className="px-3 py-4 font-medium">
                          {FACET_LABELS[c.label as Facet] ?? c.label.replaceAll('_', ' ')}
                        </th>
                        <td className="px-3 py-4 tabular-nums">{c.participants}</td>
                        <td className="px-3 py-4 tabular-nums">{c.exposed}</td>
                        <td className="px-3 py-4 tabular-nums">{percent(c.interestRate.rate)}</td>
                        <td className="px-3 py-4 tabular-nums">{c.rating?.toFixed(1) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel
            title="Reviewed audience notes"
            description="Unattributed notes accepted through quality review. Small studies do not expose comments."
          >
            {data.notes.length ? (
              <ul className="divide-y divide-ns-border">
                {data.notes.map((note, i) => (
                  <li key={i} className="py-4 text-base leading-relaxed text-ns-text">
                    “{note}”
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-ns-muted">
                Notes appear once there are at least five responses and accepted comments.
              </p>
            )}
          </Panel>
          <Panel
            title="Study record"
            description="Your previews and collection method stay attached to this study."
          >
            <div className="space-y-5">
              {data.variants.map((v) => (
                <details key={v.id} className="rounded-xl bg-ns-surface-2 p-4">
                  <summary className="cursor-pointer text-base font-semibold text-ns-text">
                    {v.label}: {v.headline}
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-ns-muted">
                    {v.concept || 'Video preview'}
                  </p>
                  {v.uploadId && (
                    <p className="mt-2 text-sm text-ns-muted">Private creator video attached</p>
                  )}
                </details>
              ))}
              <dl className="space-y-3 text-base">
                <div>
                  <dt className="font-semibold text-ns-text">Asset provenance</dt>
                  <dd className="mt-1 text-ns-muted">{data.project.rightsNote}</dd>
                </div>
                {Object.entries(data.methodology).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-semibold capitalize text-ns-text">{key}</dt>
                    <dd className="mt-1 leading-relaxed text-ns-muted">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-ns-muted">Model: {data.project.modelVersion}</p>
            </div>
          </Panel>
          {!admin && data.project.status !== 'draft' && data.project.status !== 'completed' && (
            <details className="rounded-2xl bg-ns-surface p-6">
              <summary className="cursor-pointer text-base font-semibold text-ns-muted">
                Finish this study
              </summary>
              <p className="my-4 text-base text-ns-muted">
                Completing closes collection permanently. Results and withdrawal remain available.
              </p>
              <Button variant="danger" onClick={() => status('completed')} disabled={busy}>
                Complete study permanently
              </Button>
            </details>
          )}
        </>
      )}
    </div>
  )
}
