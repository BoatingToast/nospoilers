'use client'

import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import type { StudyList } from '@/lib/audience-types'
import { DataState, dateLabel, Panel, Stat, Status, useAudienceData } from './Analytics'

export default function CreatorEngine() {
  const { data, error, loading, reload } = useAudienceData<{ studies: StudyList }>(
    '/api/audience/projects',
  )
  const studies = data?.studies ?? []
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <PageHeader
          title="Find your audience."
          description="Test the promise. Learn who responds. Build the evidence for your next release."
        />
        <Button href="/creator/audience/new">Create a study</Button>
      </div>
      <nav aria-label="Creator tools" className="flex flex-wrap gap-3">
        <Button href="/creator" variant="outline">
          Filmmaker Studio
        </Button>
        <Button href="/audience" variant="ghost">
          Explore audience studies
        </Button>
      </nav>
      <DataState error={error} loading={loading && !data} retry={reload} />
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Studies" value={studies.length} detail="Your latest 100 studies" />
            <Stat
              label="Collecting responses"
              value={studies.filter((s) => s.status === 'active').length}
            />
            <Stat
              label="Consented participants"
              value={studies.reduce((sum, s) => sum + s._count.participants, 0).toLocaleString()}
              tint
            />
          </div>
          <Panel
            title="Release research"
            description="Compare up to three previews with stable random assignment. Your reports contain aggregate results, with small-cohort protections."
          >
            {!studies.length ? (
              <div className="rounded-xl bg-ns-surface-2 p-6">
                <h3 className="font-heading text-lg font-semibold text-ns-text">
                  Start with one release decision.
                </h3>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
                  Test a trailer, description, or concept. Invite your audience, collect their
                  preferences, and learn which introduction connects.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ns-border">
                {studies.map((study) => (
                  <Link
                    key={study.id}
                    href={`/creator/audience/${study.id}`}
                    className="-mx-3 flex flex-wrap items-center justify-between gap-4 rounded-xl p-3 hover:bg-ns-surface-2"
                  >
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-ns-text">{study.title}</h3>
                      <p className="mt-1 text-sm text-ns-muted">
                        {study.mediaType} · {study._count.variants} preview
                        {study._count.variants === 1 ? '' : 's'} · {dateLabel(study.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-sm tabular-nums text-ns-muted">
                        {study._count.participants} participants
                      </span>
                      <Status value={study.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
          <Panel
            title="Evidence you can use"
            description="Every response carries its consent version, preview assignment, acquisition source, and collection time."
          >
            <div className="grid gap-6 md:grid-cols-3">
              {[
                [
                  'Audience fit',
                  'See how declared preferences relate to observed interest and feedback.',
                ],
                [
                  'Preview comparison',
                  'Keep assignment stable and compare unique participants with uncertainty intervals.',
                ],
                [
                  'Data quality',
                  'Responses are reviewed before entering the shared research dataset.',
                ],
              ].map(([title, text]) => (
                <div key={title}>
                  <h3 className="text-base font-semibold text-ns-text">{title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ns-muted">{text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
