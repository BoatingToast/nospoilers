'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { CreatorAnalytics } from '@/types'
import { FilmIcon } from '@/components/icons'
import Section from '@/components/ui/Section'

interface Props {
  collectionId: string
}

function StatCard({ label, value, sub, color }: {
  label: string
  value: string | number
  sub?:  string
  color?: 'gold' | 'green' | 'red' | 'default'
}) {
  const val =
    color === 'green' ? 'text-ns-success' :
    color === 'red'   ? 'text-ns-danger'  :
    color === 'gold'  ? 'text-ns-secondary-readable' :
    'text-ns-text'

  return (
    <div className="min-w-0 border-t border-ns-border py-3">
      <dt className="font-body text-[11px] uppercase tracking-widest text-ns-muted">{label}</dt>
      <dd className={`mt-1 font-display text-4xl leading-none tracking-wide ${val}`}>{value}</dd>
      {sub && <dd className="mt-1 font-body text-xs text-ns-muted">{sub}</dd>}
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
      <div className="grid animate-pulse grid-cols-2 gap-x-8 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 border-t border-ns-border" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="border-t border-ns-border py-8 font-body text-sm text-ns-muted">Could not load analytics.</p>
    )
  }

  return (
    <div className="space-y-12">
      {/* Overview stats */}
      <Section title="Overview">
        <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
          <StatCard label="Collections"  value={data.totalCollections} />
          <StatCard label="Total Views"  value={data.totalViews.toLocaleString()} color="gold" />
          <StatCard label="Net Score"
            value={`${data.netScore > 0 ? '+' : ''}${data.netScore}`}
            color={data.netScore > 0 ? 'green' : data.netScore < 0 ? 'red' : 'default'}
          />
          <StatCard label="Upvotes"      value={data.totalUpvotes.toLocaleString()}   color="green" />
          <StatCard label="Downvotes"    value={data.totalDownvotes.toLocaleString()} color="red" />
          <StatCard label="Approval"
            value={data.totalUpvotes + data.totalDownvotes > 0
              ? `${Math.round((data.totalUpvotes / (data.totalUpvotes + data.totalDownvotes)) * 100)}%`
              : '—'
            }
            sub="upvote ratio"
            color="gold"
          />
        </dl>
      </Section>

      {(data.topCollections.length > 0 || data.topMovies.length > 0) && (
        <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
          {/* Top collections */}
          {data.topCollections.length > 0 && (
            <Section title="Top Performing Collections">
              <table className="w-full table-fixed font-body text-sm">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-[11px] font-normal uppercase tracking-wider text-ns-muted">Collection</th>
                    <th className="w-14 pb-2 text-right text-[11px] font-normal uppercase tracking-wider text-ns-muted">Films</th>
                    <th className="w-12 pb-2 text-right text-[11px] font-normal uppercase tracking-wider text-ns-muted">▲</th>
                    <th className="w-14 pb-2 text-right text-[11px] font-normal uppercase tracking-wider text-ns-muted">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCollections.map(c => (
                    <tr key={c.id} className="border-t border-ns-border">
                      <td className="py-3 pr-3">
                        <Link href={`/collections/${c.id}`}
                          className="block truncate font-medium text-ns-text transition-colors hover:text-ns-secondary-readable">
                          {c.title}
                        </Link>
                      </td>
                      <td className="py-3 text-right text-ns-muted">{c.movieCount}</td>
                      <td className="py-3 text-right text-ns-success">{c.upvotes}</td>
                      <td className={`py-3 text-right font-semibold
                        ${c.score > 0 ? 'text-ns-success' : c.score < 0 ? 'text-ns-danger' : 'text-ns-muted'}`}>
                        {c.score > 0 ? '+' : ''}{c.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Most-included movies */}
          {data.topMovies.length > 0 && (
            <Section title="Most-Included Films">
              <ul>
                {data.topMovies.map(m => (
                  <li key={m.tmdbId} className="border-t border-ns-border">
                    <Link href={`/movie/${m.tmdbId}`} className="group flex min-w-0 items-center gap-3 py-2.5">
                      {m.posterPath ? (
                        <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded border border-ns-border">
                          <Image
                            src={tmdbImageUrl(m.posterPath, 'w185')}
                            alt={m.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-8 flex-shrink-0 items-center justify-center rounded bg-ns-border">
                          <FilmIcon size={14} className="text-ns-muted/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-medium leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                          {m.title}
                        </p>
                        <p className="font-body text-xs text-ns-muted">
                          in {m.count} collection{m.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {data.totalCollections === 0 && (
        <p className="border-t border-ns-border py-8 font-body text-sm text-ns-muted">
          Create collections and get upvotes to see your analytics here.
        </p>
      )}
    </div>
  )
}
