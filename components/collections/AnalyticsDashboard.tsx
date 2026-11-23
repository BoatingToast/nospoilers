'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Meter, revealDelay } from '@/components/watchlist/LibraryControls'
import { cn, tmdbImageUrl } from '@/lib/utils'
import type { CreatorAnalytics } from '@/types'
import { FilmIcon } from '@/components/icons'

interface Props {
  collectionId: string
}

function StatTile({ label, value, tone = 'bg-ns-surface' }: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className={cn('rounded-2xl p-6', tone)}>
      <dd className="font-display text-4xl tabular-nums text-ns-text">{value}</dd>
      <dt className="mt-1 text-sm text-ns-muted">{label}</dt>
    </div>
  )
}

export default function AnalyticsDashboard({ collectionId }: Props) {
  const [data,    setData]    = useState<CreatorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    fetch(`/api/collections/${collectionId}/analytics`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [collectionId])

  if (loading) {
    return (
      <div role="status" aria-label="Loading analytics" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return <EmptyState title="Could not load analytics." description="Refresh the page to try again." />
  }

  const totalVotes = data.totalUpvotes + data.totalDownvotes
  const approval = totalVotes > 0 ? data.totalUpvotes / totalVotes : null

  return (
    <div className="animate-fade-up space-y-12">
      <section aria-labelledby="analytics-overview">
        <h2 id="analytics-overview" className="sr-only">Overview</h2>

        <div className="mb-3 rounded-3xl bg-ns-tile-green p-7 sm:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className={cn('font-display tabular-nums text-ns-text', approval === null ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl')}>
              {approval === null ? 'No votes yet' : `${Math.round(approval * 100)}%`}
            </p>
            <p className="text-base text-ns-muted">Approval · upvote ratio</p>
          </div>
          {approval !== null && (
            <Meter value={approval} className="mt-5 h-3 bg-ns-bg/60" fillClassName="bg-ns-success" />
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Collections" value={data.totalCollections} />
          <StatTile label="Total views" value={data.totalViews.toLocaleString()} />
          <StatTile label="Net score" value={`${data.netScore > 0 ? '+' : ''}${data.netScore}`} />
          <StatTile label="Upvotes" value={data.totalUpvotes.toLocaleString()} />
          <StatTile label="Downvotes" value={data.totalDownvotes.toLocaleString()} />
        </dl>
      </section>

      {data.topCollections.length > 0 && (
        <section className="ns-reveal">
          <h2 className="mb-4 font-display text-3xl text-ns-text">Top performing collections</h2>
          <div className="overflow-hidden rounded-2xl bg-ns-surface">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-ns-border text-left text-ns-muted">
                  <th scope="col" className="px-4 py-3 font-semibold sm:px-6">Collection</th>
                  <th scope="col" className="w-16 px-2 py-3 text-right font-semibold sm:w-20">Films</th>
                  <th scope="col" className="w-14 px-2 py-3 text-right font-semibold sm:w-20">
                    <span aria-hidden="true">Up</span><span className="sr-only">Upvotes</span>
                  </th>
                  <th scope="col" className="w-16 px-4 py-3 text-right font-semibold sm:w-24 sm:px-6">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ns-border">
                {data.topCollections.map(c => (
                  <tr key={c.id} className="transition-colors duration-150 hover:bg-ns-surface-2">
                    <td className="px-4 py-1 sm:px-6">
                      <Link href={`/collections/${c.id}`} className="flex min-h-11 items-center font-semibold text-ns-text transition-colors duration-150 hover:text-ns-secondary-readable">
                        <span className="truncate">{c.title}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-ns-muted">{c.movieCount}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-ns-success">{c.upvotes}</td>
                    <td className={cn(
                      'px-4 py-1 text-right font-semibold tabular-nums sm:px-6',
                      c.score > 0 ? 'text-ns-success' : c.score < 0 ? 'text-ns-danger' : 'text-ns-muted',
                    )}>
                      {c.score > 0 ? '+' : ''}{c.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.topMovies.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-3xl text-ns-text">Most-included films</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.topMovies.map((m, index) => (
              <div key={m.tmdbId} className="ns-reveal" style={revealDelay(index)}>
                <Link
                  href={`/movie/${m.tmdbId}`}
                  className="group flex items-center gap-3 rounded-2xl bg-ns-surface p-3 transition-colors duration-150 hover:bg-ns-surface-2"
                >
                  <div className="relative aspect-[2/3] w-11 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-3">
                    {m.posterPath ? (
                      <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt="" fill className="object-cover" sizes="44px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <FilmIcon size={16} className="text-ns-subtle" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                      {m.title}
                    </p>
                    <p className="text-sm tabular-nums text-ns-muted">
                      in {m.count} collection{m.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.totalCollections === 0 && (
        <EmptyState
          title="No analytics yet"
          description="Create collections and get upvotes to see your analytics here."
        />
      )}
    </div>
  )
}
