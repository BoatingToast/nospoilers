'use client'

import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import type { StudyOpportunities } from '@/lib/audience-types'
import { DataState, Panel, useAudienceData } from './Analytics'

export default function StudyDiscovery() {
  const { data, error, loading, reload } = useAudienceData<{ studies: StudyOpportunities }>(
    '/api/audience/opportunities',
  )
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-wrap justify-between gap-5">
        <PageHeader
          title="Be an early audience."
          description="Discover original work, share your perspective, and help creators learn who they connect with."
        />
        <Button href="/creator/audience" variant="outline">
          For creators
        </Button>
      </div>
      <DataState error={error} loading={loading} retry={reload} />
      {data && (
        <Panel
          title="Open audience studies"
          description="Participation is optional. Your preferences and research choices are confirmed before any preview is assigned."
        >
          {!data.studies.length ? (
            <div className="rounded-xl bg-ns-surface-2 p-6">
              <h3 className="text-lg font-semibold text-ns-text">New work will appear here.</h3>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">
                There are no discoverable studies collecting responses right now. You can also join
                through a creator’s invitation link.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ns-border">
              {data.studies.map((study) => (
                <li
                  key={study.shareCode}
                  className="flex flex-wrap items-center justify-between gap-5 py-6"
                >
                  <div className="max-w-2xl">
                    <p className="text-sm capitalize text-ns-muted">{study.mediaType}</p>
                    <h3 className="mt-1 font-heading text-xl font-bold text-ns-text">
                      {study.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-ns-muted">
                      {study.description}
                    </p>
                    {study.fit && (
                      <p className="mt-3 text-sm text-ns-secondary-readable">
                        {study.fit.band.charAt(0).toUpperCase() + study.fit.band.slice(1)} to your
                        Movie DNA · exploratory preference alignment
                      </p>
                    )}
                  </div>
                  <Button variant="outline" href={`/audience/${study.shareCode}?source=discovery`}>
                    View study
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
