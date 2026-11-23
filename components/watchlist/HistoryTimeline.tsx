'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { formatYear } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'
import { FilterInput, PillTabs, SortSelect, posterZoomClass, revealDelay } from './LibraryControls'

interface Props {
  byMonth: Record<string, WatchlistItemData[]>
}

type Order = 'newest' | 'oldest'

const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

export default function HistoryTimeline({ byMonth }: Props) {
  const [year,  setYear]  = useState('all')
  const [order, setOrder] = useState<Order>('newest')
  const [query, setQuery] = useState('')

  const years = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [month, movies] of Object.entries(byMonth)) {
      const key = month.split(' ').pop() ?? month
      counts.set(key, (counts.get(key) ?? 0) + movies.length)
    }
    return Array.from(counts.entries())
  }, [byMonth])

  const months = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const entries = Object.entries(byMonth)
      .filter(([month]) => year === 'all' || month.endsWith(year))
      .map(([month, movies]): [string, WatchlistItemData[]] => [
        month,
        needle ? movies.filter(movie => movie.title.toLowerCase().includes(needle)) : movies,
      ])
      .filter(([, movies]) => movies.length > 0)
    return order === 'newest' ? entries : [...entries].reverse().map(([month, movies]): [string, WatchlistItemData[]] => [month, [...movies].reverse()])
  }, [byMonth, year, order, query])

  const yearOptions = [
    { value: 'all', label: 'All time' },
    ...years.map(([value, count]) => ({ value, label: value, count })),
  ]

  return (
    <div>
      <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PillTabs label="Filter by year" options={yearOptions} value={year} onChange={setYear} />
        <div className="flex flex-wrap items-center gap-2">
          <FilterInput
            label="Filter history by title"
            placeholder="Filter by title"
            value={query}
            onChange={setQuery}
            className="min-w-0 flex-1 basis-full sm:basis-56"
          />
          <SortSelect label="Sort history" value={order} options={ORDER_OPTIONS} onChange={setOrder} className="min-w-0 flex-1 sm:flex-none" />
        </div>
      </div>

      {months.length === 0 ? (
        <EmptyState
          title={query.trim() ? `No films match “${query.trim()}”` : 'Nothing watched in this period'}
          description="Try another title or year."
          action={<Button variant="secondary" onClick={() => { setQuery(''); setYear('all') }}>Clear filters</Button>}
        />
      ) : (
        <div key={`${year}-${order}`} className="flex animate-fade-up flex-col gap-12 lg:gap-16">
          {months.map(([month, movies], monthIndex) => (
            <section
              key={month}
              className={monthIndex > 0 ? 'ns-reveal grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10' : 'grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10'}
            >
              <div className="flex items-baseline justify-between gap-4 lg:sticky lg:top-32 lg:block lg:self-start">
                <h2 className="font-heading text-2xl font-bold text-ns-text">{month}</h2>
                <p className="text-sm tabular-nums text-ns-muted lg:mt-1">
                  {movies.length} film{movies.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 xl:grid-cols-6">
                {movies.map((movie, index) => (
                  <div key={movie.tmdbId} className={index > 5 ? 'ns-reveal' : undefined} style={index > 5 ? revealDelay(index) : undefined}>
                    <Link href={`/movie/${movie.tmdbId}`} className="group block min-w-0">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
                        <PosterFill
                          path={movie.posterPath}
                          size="w185"
                          className={posterZoomClass}
                          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 150px"
                        />
                        {movie.rating ? (
                          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                            {movie.rating}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                        {movie.title}
                      </p>
                      <p className="text-xs tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
