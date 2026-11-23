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

interface Item {
  tmdbId:    number
  title:     string
  posterPath: string | null
  status:    string
  addedAt:   string
}

const STATUS_TABS = [
  ['want_to_watch', 'To Watch'],
  ['watching', 'Watching'],
  ['watched', 'History'],
] as const

type Status = (typeof STATUS_TABS)[number][0]

export default function WatchlistTab() {
  const [items,  setItems]  = useState<Item[]>([])
  const [status, setStatus] = useState<Status>('want_to_watch')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/watchlist?status=${status}`)
      .then(r => r.json())
      .then(data => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <FilterPills label="Filter watchlist" value={status} onChange={setStatus} options={STATUS_TABS} />
        <SectionLink href="/watchlist">Full page</SectionLink>
      </div>

      {loading ? (
        <div aria-hidden="true" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet."
          action={<Button variant="secondary" href="/discover" className="bg-ns-surface-2 hover:bg-ns-surface-3">Discover films</Button>}
        />
      ) : (
        <ul key={status} className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-4">
          {items.map((item, index) => (
            <li key={item.tmdbId} className="ns-reveal min-w-0" style={{ '--i': index % 6 } as React.CSSProperties}>
              <Link href={`/movie/${item.tmdbId}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                  {item.posterPath ? (
                    <Image
                      src={tmdbImageUrl(item.posterPath, 'w342')}
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
                  {item.status === 'watching' && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ns-secondary px-2 py-0.5 text-xs font-bold text-ns-secondary-foreground">
                      Now
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {item.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
