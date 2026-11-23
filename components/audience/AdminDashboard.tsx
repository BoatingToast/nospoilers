'use client'

import { useState } from 'react'
import Link from 'next/link'
import DirectionDashboard from './DirectionDashboard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/ui/PageHeader'
import type { AdminOverview, EventPage, AudienceResponsePage } from '@/lib/audience-types'
import {
  audienceRequest,
  DataState,
  dateLabel,
  Distribution,
  fieldClass,
  Panel,
  Stat,
  Status,
  Trend,
  useAudienceData,
} from './Analytics'

function EventExplorer({ days }: { days: number }) {
  const [type, setType] = useState(''),
    [cursor, setCursor] = useState('')
  const { data, loading, error, reload } = useAudienceData<EventPage>(
    `/api/admin/audience/events?days=${days}&type=${type}&cursor=${cursor}`,
  )
  return (
    <Panel
      title="Event explorer"
      description="Server timestamps, study lineage, consent status, and sanitized payloads. No email addresses or names."
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="event-type" className="mb-2 block text-sm text-ns-muted">
            Event type
          </label>
          <select
            id="event-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setCursor('')
            }}
            className={fieldClass}
          >
            <option value="">All events</option>
            {[
              'enrollment',
              'exposure',
              'start',
              'progress',
              'interest',
              'feedback',
              'feedback_updated',
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCursor('')
            reload()
          }}
        >
          Refresh events
        </Button>
      </div>
      <DataState error={error} loading={loading} retry={reload} />
      {data && !loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ns-muted">
                <tr>
                  {[
                    'Time',
                    'Event',
                    'Study / preview',
                    'Sample',
                    'Quality',
                    'Reuse consent',
                    'Payload',
                  ].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ns-border text-ns-text">
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-4">{row.type}</td>
                    <td className="px-3 py-4">
                      {row.participant.project.title}
                      <span className="block text-ns-muted">{row.participant.variant.label}</span>
                    </td>
                    <td className="px-3 py-4 font-mono">{row.participantId.slice(-8)}</td>
                    <td className="px-3 py-4">
                      <Status value={row.participant.quality} />
                    </td>
                    <td className="px-3 py-4">
                      {row.participant.reuseConsent ? 'Opted in' : 'Study only'}
                    </td>
                    <td className="max-w-xs px-3 py-4">
                      <details>
                        <summary className="cursor-pointer text-ns-secondary-readable">
                          Inspect v{row.schemaVersion}
                        </summary>
                        <pre className="mt-2 max-w-xs overflow-auto rounded-lg bg-ns-bg p-3 text-sm">
                          {JSON.stringify(row.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.rows.length && (
            <p className="py-6 text-base text-ns-muted">No events match this window.</p>
          )}
          <div className="mt-5 flex gap-3">
            {cursor && (
              <Button variant="outline" onClick={() => setCursor('')}>
                First page
              </Button>
            )}
            {data.nextCursor && (
              <Button variant="outline" onClick={() => setCursor(data.nextCursor ?? '')}>
                Next 50 events
              </Button>
            )}
          </div>
        </>
      )}
    </Panel>
  )
}

function ReviewCard({
  row,
  onReviewed,
}: {
  row: AdminOverview['queue'][number]
  onReviewed: () => void
}) {
  const [note, setNote] = useState(row.reviewNote),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function review(quality: string) {
    setBusy(true)
    setError('')
    try {
      await audienceRequest('/api/admin/audience/review', {
        method: 'PATCH',
        body: JSON.stringify({ id: row.id, quality, note }),
      })
      onReviewed()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="space-y-4 rounded-xl bg-ns-surface-2 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-ns-text">{row.project.title}</h3>
          <p className="mt-1 text-sm text-ns-muted">
            {row.variant.label} · Sample {row.id.slice(-8)} · {dateLabel(row.feedbackAt ?? '')}
          </p>
        </div>
        <span className="text-sm text-ns-muted">
          <Status value={row.quality} />{' '}
          {row.reuseConsent ? 'Shared-dataset consent' : 'Study-only consent'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        {[
          ['Rating', `${row.rating}/5`],
          ['Intent', `${row.intent}/5`],
          ['Expectation fit', `${row.expectation}/5`],
          ['Time to feedback', `${row.secondsToFeedback ?? '—'}s`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-ns-muted">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums text-ns-text">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ns-muted">
        Source: {row.source} · Alignment: {row.fitBand} · Reported progress: {row.progress}%
      </p>
      {row.secondsToFeedback !== null && row.secondsToFeedback < 15 && (
        <p className="text-sm text-ns-warning">
          Fast response: inspect the content before accepting. Timing alone does not establish poor
          quality.
        </p>
      )}
      <p className="whitespace-pre-wrap text-base leading-relaxed text-ns-text">
        {row.note || 'No written note supplied.'}
      </p>
      <Input
        id={`review-${row.id}`}
        label="Quality review note"
        value={note}
        maxLength={600}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Check relevance, consistency, and personally identifying information."
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={busy} onClick={() => review('accepted')}>
          Accept response
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => review('excluded')}>
          Exclude response
        </Button>
        {row.quality !== 'pending' && (
          <Button variant="ghost" disabled={busy} onClick={() => review('pending')}>
            Return to pending
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-ns-danger">
          {error}
        </p>
      )}
    </article>
  )
}

function ReviewQueue({ onReviewed }: { onReviewed: () => void }) {
  const [quality, setQuality] = useState('pending')
  const [cursor, setCursor] = useState('')
  const { data, error, loading, reload } = useAudienceData<AudienceResponsePage>(
    `/api/admin/audience/responses?quality=${quality}&cursor=${cursor}`,
  )
  function reviewed() {
    reload()
    onReviewed()
  }
  return (
    <Panel
      title="Review the evidence"
      description="Review relevance, consistency, and identifying information independently of positive or negative opinion. Review history remains available, and decisions can be corrected."
    >
      <div className="mb-6">
        <label htmlFor="review-status" className="mb-2 block text-sm font-semibold text-ns-text">
          Review status
        </label>
        <select
          id="review-status"
          className={`${fieldClass} sm:!w-64`}
          value={quality}
          onChange={(event) => {
            setQuality(event.target.value)
            setCursor('')
          }}
        >
          {['pending', 'accepted', 'excluded', 'all'].map((value) => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <DataState error={error} loading={loading} retry={reload} />
      {data && !loading && (
        <>
          <div className="space-y-5">
            {data.rows.map((row) => (
              <ReviewCard key={row.id} row={row} onReviewed={reviewed} />
            ))}
          </div>
          {!data.rows.length && (
            <p className="text-base text-ns-muted">
              No submitted responses match this review status.
            </p>
          )}
          <div className="mt-6 flex gap-3">
            {cursor && (
              <Button variant="outline" onClick={() => setCursor('')}>
                First page
              </Button>
            )}
            {data.nextCursor && (
              <Button variant="outline" onClick={() => setCursor(data.nextCursor ?? '')}>
                Next 25 responses
              </Button>
            )}
          </div>
        </>
      )}
    </Panel>
  )
}

export default function AdminDashboard() {
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [days, setDays] = useState(30),
    [tab, setTab] = useState('Overview')
  const { data, error, loading, reload } = useAudienceData<AdminOverview>(
    `/api/admin/audience?days=${days}`,
  )
  const [datasetName, setDatasetName] = useState(''),
    [creating, setCreating] = useState(false),
    [datasetError, setDatasetError] = useState('')
  async function createDataset(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    setDatasetError('')
    try {
      await audienceRequest('/api/admin/audience/datasets', {
        method: 'POST',
        body: JSON.stringify({ name: datasetName }),
      })
      setDatasetName('')
      reload()
    } catch (cause) {
      setDatasetError(cause instanceof Error ? cause.message : 'Dataset creation failed.')
    } finally {
      setCreating(false)
    }
  }
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <PageHeader
          title="Audience intelligence."
          description="The NoSpoilers data workspace. Follow collection, inspect quality, and build permissioned research datasets."
        />
        <div className="rounded-full bg-ns-tile-lilac px-4 py-2 text-sm font-semibold text-ns-text">
          Admin workspace
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div role="tablist" aria-label="Admin views" className="flex flex-wrap gap-2">
          {['Overview', 'Direction', 'Quality review', 'Events', 'Datasets'].map((label) => (
            <button
              key={label}
              role="tab"
              id={`tab-${label.replaceAll(' ', '-')}`}
              aria-selected={tab === label}
              aria-controls="admin-panel"
              onClick={() => setTab(label)}
              className={`min-h-11 rounded-full px-5 text-sm font-semibold ${tab === label ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface text-ns-muted hover:bg-ns-surface-2'}`}
            >
              {label}
              {label === 'Quality review' && data
                ? ` (${data.queue.length}${data.queue.length === 25 ? '+' : ''})`
                : ''}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="admin-days" className="text-sm text-ns-muted">
            Event window
          </label>
          <select
            id="admin-days"
            className={`${fieldClass} !w-auto !py-2`}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => { reload(); setRefreshVersion(value => value + 1) }}>
            Refresh
          </Button>
        </div>
      </div>
      <DataState error={error} loading={loading && !data} retry={reload} />
      {data && <p className="text-sm text-ns-muted">Overview refreshed {new Date(data.generatedAt).toLocaleString()}. Event activity uses the selected window; research totals are lifetime.</p>}
      {data && (
        <div
          role="tabpanel"
          id="admin-panel"
          aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}
          className="space-y-6"
        >
          {tab === 'Overview' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  label="Research participants"
                  value={data.research.participants.toLocaleString()}
                  detail="Lifetime, consented study enrollments"
                />
                <Stat
                  label="First-party events"
                  value={data.research.events.toLocaleString()}
                  detail={`Last ${days} days; idempotent collection`}
                />
                <Stat
                  label="Submitted feedback"
                  value={data.research.feedback.toLocaleString()}
                  detail="Lifetime responses, before exclusions"
                />
                <Stat
                  label="Dataset-eligible responses"
                  value={data.research.reusable.toLocaleString()}
                  detail="Accepted quality + explicit reuse consent"
                  tint
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <Panel
                  title="Collection activity"
                  description={`Daily event volume over the last ${days} days, in UTC.`}
                >
                  <Trend rows={data.daily.map((row) => ({ day: row.day, value: row.events }))} />
                </Panel>
                <Panel
                  title="Collection sources"
                  description="Lifetime participant enrollments by recruitment source."
                >
                  <Distribution rows={data.sources} />
                </Panel>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel
                  title="Platform foundation"
                  description="Lifetime operational counts. These records are separate from the consented research dataset."
                >
                  <Distribution
                    rows={Object.entries(data.platform).map(([label, count]) => ({
                      label: label === 'ratedWorks' ? 'Rated film IDs' : label,
                      count,
                    }))}
                  />
                </Panel>
                <Panel title="Research event coverage">
                  <Distribution rows={data.eventTypes} />
                </Panel>
                <Panel title="Quality outcomes" description="Submitted responses by review status.">
                  <Distribution
                    rows={Object.entries(data.quality).map(([label, count]) => ({ label, count }))}
                  />
                </Panel>
              </div>
              <Panel
                title="Latest studies"
                description={`${data.research.studies} studies across the platform. Showing the latest 25.`}
              >
                {data.recentStudies.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-ns-muted">
                        <tr>
                          {['Study', 'Medium', 'Status', 'Participants', 'Created'].map((h) => (
                            <th key={h} scope="col" className="px-3 py-3 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ns-border text-ns-text">
                        {data.recentStudies.map((study) => (
                          <tr key={study.id}>
                            <th scope="row" className="px-3 py-4 font-semibold">
                              <Link
                                href={`/admin/studies/${study.id}`}
                                className="text-ns-secondary-readable hover:underline"
                              >
                                {study.title}
                              </Link>
                            </th>
                            <td className="px-3 py-4 capitalize">{study.mediaType}</td>
                            <td className="px-3 py-4">
                              <Status value={study.status} />
                            </td>
                            <td className="px-3 py-4 tabular-nums">{study._count.participants}</td>
                            <td className="whitespace-nowrap px-3 py-4">
                              {dateLabel(study.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-base text-ns-muted">
                    No studies yet. Create the first study in Filmmaker Studio.
                  </p>
                )}
              </Panel>
              <Panel
                title="Model evidence"
                description="The current engine uses explicit preference distance. It has not established predictive accuracy or causal lift from these observations."
              >
                <dl className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-ns-muted">Model version</dt>
                    <dd className="mt-2 text-base font-semibold text-ns-text">
                      {data.modelVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ns-muted">Human-reviewed reuse pool</dt>
                    <dd className="mt-2 text-base font-semibold text-ns-text">
                      {data.research.reusable} responses
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ns-muted">Evaluation policy</dt>
                    <dd className="mt-2 text-base font-semibold text-ns-text">
                      Whole-study holdout split
                    </dd>
                  </div>
                </dl>
              </Panel>
            </>
          )}
          {tab === 'Quality review' && <ReviewQueue key={refreshVersion} onReviewed={reload} />}
          {tab === 'Direction' && <DirectionDashboard key={`${days}-${refreshVersion}`} days={days} navigate={setTab} />}
          {tab === 'Events' && <EventExplorer key={`${days}-${refreshVersion}`} days={days} />}
          {tab === 'Datasets' && (
            <>
              <Panel
                title="Create a dataset version"
                description="Freeze up to 5,000 accepted, opted-in responses. Exports omit account identifiers, free-text notes, and source media. Projects stay in one split to reduce evaluation leakage."
              >
                <form onSubmit={createDataset} className="flex flex-wrap items-end gap-4">
                  <div className="min-w-64 flex-1">
                    <Input
                      id="dataset-name"
                      label="Version name"
                      required
                      maxLength={100}
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="Audience research · November 2026"
                    />
                  </div>
                  <Button type="submit" loading={creating}>
                    Create dataset version
                  </Button>
                </form>
                {datasetError && (
                  <p role="alert" className="mt-4 text-base text-ns-danger">
                    {datasetError}
                  </p>
                )}
              </Panel>
              <Panel
                title="Dataset registry"
                description="Consent withdrawal or a response correction purges affected local versions and disables their download."
              >
                {data.datasets.length ? (
                  <div className="space-y-5">
                    {data.datasets.map((dataset) => (
                      <div
                        key={dataset.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ns-surface-2 p-5"
                      >
                        <div>
                          <h3 className="font-heading text-lg font-bold text-ns-text">
                            {dataset.name}
                          </h3>
                          <p className="mt-2 text-sm text-ns-muted">
                            {dataset.rowCount} rows · {dataset.trainCount} train ·{' '}
                            {dataset.evaluationCount} evaluation · Schema v{dataset.schemaVersion} ·{' '}
                            {dateLabel(dataset.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-ns-muted">{dataset.modelVersion}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Status value={dataset.invalidatedAt ? 'invalidated' : 'valid'} />
                          {!dataset.invalidatedAt && (
                            <Button
                              variant="outline"
                              href={`/api/admin/audience/datasets/${dataset.id}`}
                            >
                              Download JSONL
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-ns-muted">
                    No dataset versions yet. Review opted-in responses to create the first one.
                  </p>
                )}
              </Panel>
              <Panel
                title="Audit trail"
                description="Latest 20 study, review, consent, and export actions."
              >
                <ol className="divide-y divide-ns-border">
                  {data.audit.map((row) => (
                    <li key={row.id} className="py-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-sm font-semibold text-ns-text">{row.action}</span>
                        <time className="text-sm text-ns-muted">
                          {new Date(row.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-ns-secondary-readable">
                          Inspect audit record
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-lg bg-ns-bg p-3 text-sm text-ns-muted">
                          {JSON.stringify({ target: row.targetId, detail: row.detail }, null, 2)}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ol>
                {!data.audit.length && (
                  <p className="text-base text-ns-muted">No actions recorded yet.</p>
                )}
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  )
}
