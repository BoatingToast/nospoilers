'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { FilmIcon, ArrowRightIcon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'

interface Rating {
  tmdbId:    number
  title:     string
  posterPath: string | null
  score:     number
  createdAt: string
}

type Sort = 'date' | 'score_desc' | 'score_asc'

function scoreColor(s: number) {
  if (s >= 85) return 'text-ns-secondary-readable'
  if (s >= 70) return 'text-emerald-400'
  if (s >= 50) return 'text-blue-400'
  return 'text-ns-muted'
}

export default function RatingsTab() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [sort,    setSort]    = useState<Sort>('date')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const orderBy = sort === 'date' ? 'date' : 'score'
    fetch(`/api/ratings?sort=${orderBy}&limit=48`)
      .then(r => r.json())
      .then(data => {
        let items: Rating[] = data.items ?? []
        if (sort === 'score_asc') items = [...items].sort((a, b) => a.score - b.score)
        setRatings(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sort])

  return (
    <div className="space-y-8">
      {/* Sort + link */}
      <PageHeader title="Ratings">
        <span className="font-body text-sm text-ns-muted">Sort:</span>
        {([
          ['date',       'Recent'  ],
          ['score_desc', 'Highest' ],
          ['score_asc',  'Lowest'  ],
        ] as [Sort, string][]).map(([s, label]) => (
          <Button
            key={s}
            variant={sort === s ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={sort === s}
            onClick={() => setSort(s)}
            className="min-h-10"
          >
            {label}
          </Button>
        ))}
        <Link href="/ratings" className="inline-flex items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          Full page <ArrowRightIcon size={11} className="inline-block" />
        </Link>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded bg-ns-surface-2" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <div>
          <p className="font-body text-sm text-ns-muted">No ratings yet.</p>
          <Link href="/discover" className="mt-2 inline-flex items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
            Discover films to rate <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {ratings.map(r => (
            <Link key={r.tmdbId} href={`/movie/${r.tmdbId}`} className="group min-w-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface-2 transition-colors group-hover:border-ns-text/60">
                {r.posterPath ? (
                  <Image
                    src={tmdbImageUrl(r.posterPath, 'w342')}
                    alt={r.title}
                    fill sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/40" />
                  </div>
                )}
              </div>
              <p className="mt-1.5 flex items-baseline justify-between gap-2 font-body text-[11px] text-ns-muted">
                <span className="line-clamp-1 transition-colors group-hover:text-ns-text">{r.title}</span>
                <span className={`flex-shrink-0 font-bold tabular-nums ${scoreColor(r.score)}`}>{r.score}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
