'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { CreatorAnalytics } from '@/types'
import { FilmIcon } from '@/components/icons'

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
    color === 'green' ? 'text-emerald-400' :
    color === 'red'   ? 'text-red-400'     :
    color === 'gold'  ? 'text-ns-gold'     :
    'text-ns-text'

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-2">{label}</p>
      <p className={`font-display text-3xl tracking-wider ${val}`}>{value}</p>
      {sub && <p className="text-ns-muted/60 text-xs font-body mt-1">{sub}</p>}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-ns-surface border border-ns-border rounded-2xl p-5 h-24" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="border border-dashed border-ns-border rounded-2xl p-8 text-center">
        <p className="text-ns-muted font-body text-sm">Could not load analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overview stats */}
      <section>
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* Top collections */}
      {data.topCollections.length > 0 && (
        <section>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
            Top Performing Collections
          </p>
          <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-ns-border">
                  <th className="text-left text-ns-muted text-[10px] tracking-wider uppercase px-5 py-3">Collection</th>
                  <th className="text-right text-ns-muted text-[10px] tracking-wider uppercase px-4 py-3">Films</th>
                  <th className="text-right text-ns-muted text-[10px] tracking-wider uppercase px-4 py-3">▲</th>
                  <th className="text-right text-ns-muted text-[10px] tracking-wider uppercase px-5 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.topCollections.map((c, i) => (
                  <tr key={c.id}
                    className={`${i > 0 ? 'border-t border-ns-border/50' : ''} hover:bg-ns-surface/50 transition-colors`}>
                    <td className="px-5 py-3">
                      <Link href={`/collections/${c.id}`}
                        className="text-ns-text hover:text-ns-gold transition-colors font-medium truncate block max-w-[180px]">
                        {c.title}
                      </Link>
                    </td>
                    <td className="text-right text-ns-muted/70 px-4 py-3">{c.movieCount}</td>
                    <td className="text-right text-emerald-400 px-4 py-3">{c.upvotes}</td>
                    <td className={`text-right px-5 py-3 font-semibold
                      ${c.score > 0 ? 'text-emerald-400' : c.score < 0 ? 'text-red-400' : 'text-ns-muted'}`}>
                      {c.score > 0 ? '+' : ''}{c.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Most-included movies */}
      {data.topMovies.length > 0 && (
        <section>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
            Most-Included Films
          </p>
          <div className="flex gap-3 flex-wrap">
            {data.topMovies.map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`}
                className="group flex items-center gap-2.5 bg-ns-surface border border-ns-border rounded-xl
                           px-3 py-2 hover:border-ns-gold/30 transition-all">
                {m.posterPath ? (
                  <div className="relative w-8 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-ns-border">
                    <Image
                      src={tmdbImageUrl(m.posterPath, 'w185')}
                      alt={m.title}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-12 rounded-lg bg-ns-border flex-shrink-0 flex items-center justify-center">
                    <FilmIcon size={14} className="text-ns-muted/40" />
                  </div>
                )}
                <div>
                  <p className="text-ns-text text-xs font-body font-medium leading-tight truncate max-w-[120px]
                                group-hover:text-ns-gold transition-colors">
                    {m.title}
                  </p>
                  <p className="text-ns-muted/60 text-[10px] font-body">
                    in {m.count} collection{m.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.totalCollections === 0 && (
        <div className="border border-dashed border-ns-border rounded-2xl p-8 text-center">
          <p className="text-ns-muted font-body text-sm">
            Create collections and get upvotes to see your analytics here.
          </p>
        </div>
      )}
    </div>
  )
}
