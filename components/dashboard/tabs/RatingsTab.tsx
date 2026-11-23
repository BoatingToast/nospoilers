'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { FilmIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import FilterPills from '../FilterPills'
import { SectionLink } from '../SectionHeading'

interface Rating {
  tmdbId:    number
  title:     string
  posterPath: string | null
  score:     number
  createdAt: string
}

type Sort = 'date' | 'score_desc' | 'score_asc'

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
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <FilterPills
          label="Sort ratings"
          value={sort}
          onChange={setSort}
          options={[['date', 'Recent'], ['score_desc', 'Highest'], ['score_asc', 'Lowest']] as const}
        />
        <SectionLink href="/ratings">Full page</SectionLink>
      </div>

      {loading ? (
        <div aria-hidden="true" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <EmptyState
          title="No ratings yet."
          action={<Button variant="secondary" href="/discover" className="bg-ns-surface-2 hover:bg-ns-surface-3">Discover films to rate</Button>}
        />
      ) : (
        <ul key={sort} className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-4">
          {ratings.map((r, index) => (
            <li key={r.tmdbId} className="ns-reveal min-w-0" style={{ '--i': index % 6 } as React.CSSProperties}>
              <Link href={`/movie/${r.tmdbId}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                  {r.posterPath ? (
                    <Image
                      src={tmdbImageUrl(r.posterPath, 'w342')}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 190px, (min-width: 640px) 25vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FilmIcon size={28} className="text-ns-muted" />
                    </div>
                  )}
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/80 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                    {r.score}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {r.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
