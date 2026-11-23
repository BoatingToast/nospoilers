'use client'

import Button from '@/components/ui/Button'
import type { AudienceDirection } from '@/lib/audience-types'
import { FACET_LABELS, type Facet } from '@/lib/audience-engine'
import { DataState, Distribution, Panel, percent, Stat, useAudienceData } from './Analytics'

export default function DirectionDashboard({
  days,
  navigate,
}: {
  days: number
  navigate: (tab: string) => void
}) {
  const { data, error, loading, reload } = useAudienceData<AudienceDirection>(
    `/api/admin/audience/direction?days=${days}`,
  )
  return (
    <div className="space-y-6">
      <DataState error={error} loading={loading && !data} retry={reload} />
      {data && (
        <>
          <Panel
            title="Where to focus next"
            description="Operational priorities derived from the counts below. Collection targets guide the work; they do not establish model accuracy or market demand."
          >
            {data.priorities.length ? (
              <div className="divide-y divide-ns-border">
                {data.priorities.map((priority) => (
                  <article
                    key={priority.title}
                    className="flex flex-wrap items-start justify-between gap-5 py-5 first:pt-0 last:pb-0"
                  >
                    <div className="max-w-2xl">
                      <p className="mb-1 text-sm capitalize text-ns-secondary-readable">
                        {priority.urgency}
                      </p>
                      <h3 className="font-heading text-lg font-bold text-ns-text">
                        {priority.title}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-ns-text">
                        {priority.evidence}
                      </p>
                      <p className="mt-1 text-base leading-relaxed text-ns-muted">
                        {priority.action}
                      </p>
                    </div>
                    {priority.destination === 'studies' ? (
                      <Button href="/creator/audience" variant="outline">
                        Open studies
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            priority.destination === 'review' ? 'Quality review' : 'Datasets',
                          )
                        }
                      >
                        {priority.destination === 'review' ? 'Review responses' : 'Open datasets'}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-base text-ns-muted">
                No collection rule is currently triggered. Inspect the coverage and outcome tables
                before choosing the next experiment.
              </p>
            )}
          </Panel>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Reviewed reusable responses"
              value={data.counts.eligible}
              detail="Accepted, opted in, exposed, and submitted"
              tint
            />
            <Stat
              label="Independent works"
              value={data.counts.eligibleWorks}
              detail="Works represented in the reuse pool"
            />
            <Stat
              label="Distinct contributors"
              value={data.uniqueContributors}
              detail="A person can participate in several works"
            />
            <Stat
              label="Data-contract issues"
              value={data.counts.validationIssues}
              detail={`${data.health.total} enrollments checked`}
            />
          </div>
          <Panel
            title="Evidence by medium"
            description="Lifetime, human-accepted responses with shared-research consent. This describes the collected sample; it does not estimate the size of a market."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-ns-muted">
                  <tr>
                    {[
                      'Medium',
                      'Works',
                      'Responses',
                      'Interest / exposed',
                      'Rating / 5',
                      'Evidence status',
                    ].map((h) => (
                      <th key={h} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ns-border text-ns-text">
                  {data.media.map((row) => (
                    <tr key={row.medium}>
                      <th scope="row" className="px-3 py-4 font-semibold capitalize">
                        {row.medium}
                      </th>
                      <td className="px-3 py-4 tabular-nums">{row.works}</td>
                      <td className="px-3 py-4 tabular-nums">{row.responses}</td>
                      <td className="whitespace-nowrap px-3 py-4 tabular-nums">
                        {row.interested} / {row.exposed} · {percent(row.interestRate.rate)}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {row.averageRating?.toFixed(1) ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-ns-muted">{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ns-muted">
              Planning milestones: three independent works and 100 reviewed responses per medium.
              Statistical power must be planned separately for the hypothesis you want to test.
            </p>
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Preference coverage"
              description="Primary interests among accepted, opted-in responses. Empty segments reveal where your dataset has no evidence yet."
            >
              <Distribution
                rows={data.interests.map((row) => ({
                  ...row,
                  label: FACET_LABELS[row.label as Facet] ?? row.label,
                }))}
              />
            </Panel>
            <Panel
              title="Data contract checks"
              description="Checks all study enrollments, including records awaiting review. One record can fail several checks."
            >
              <dl className="divide-y divide-ns-border">
                {data.health.issues.map((issue) => (
                  <div key={issue.label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-base text-ns-muted">{issue.label}</dt>
                    <dd
                      className={`text-base font-semibold tabular-nums ${issue.count ? 'text-ns-warning' : 'text-ns-success'}`}
                    >
                      {issue.count}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-ns-muted">
                Invalid records are blocked from dataset creation until corrected or excluded.
              </p>
            </Panel>
          </div>
          <Panel
            title="Does preference alignment relate to enjoyment?"
            description="A descriptive check on accepted, opted-in feedback. Positive means a rating of 4 or 5. These associations do not measure predictive accuracy or causal lift."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-ns-muted">
                  <tr>
                    {[
                      'Alignment band',
                      'Responses',
                      'Positive rating rate',
                      '95% interval',
                      'Average rating',
                    ].map((h) => (
                      <th key={h} scope="col" className="px-3 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ns-border text-ns-text">
                  {data.alignment.map((row) => (
                    <tr key={row.band}>
                      <th scope="row" className="px-3 py-4 font-semibold capitalize">
                        {row.band}
                      </th>
                      <td className="px-3 py-4 tabular-nums">{row.responses}</td>
                      <td className="px-3 py-4 tabular-nums">{percent(row.positiveRate.rate)}</td>
                      <td className="whitespace-nowrap px-3 py-4 tabular-nums">
                        {row.positiveRate.low == null
                          ? '—'
                          : `${percent(row.positiveRate.low)}–${percent(row.positiveRate.high)}`}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {row.averageRating?.toFixed(1) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            title="Product adoption signals"
            description={`Last ${days} days. These are operational aggregates and are not automatically eligible for AI training.`}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['New accounts', data.product.newUsers],
                ['New accounts onboarded', data.product.onboarded],
                ['Members rating films', data.product.activeRaters],
                ['Members adding to watchlist', data.product.watchlisters],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-sm text-ns-muted">{label}</p>
                  <p className="mt-2 font-display text-3xl tabular-nums text-ns-text">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="mb-4 text-base font-semibold text-ns-text">Import outcomes</h3>
                <Distribution rows={data.product.imports} />
              </div>
              <div>
                <h3 className="mb-4 text-base font-semibold text-ns-text">
                  Recommendation feedback
                </h3>
                <Distribution rows={data.product.recommendationFeedback} />
              </div>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
