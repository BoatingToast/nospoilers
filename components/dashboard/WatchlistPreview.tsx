'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { PlusIcon } from '@/components/icons'
import { cn, tmdbImageUrl } from '@/lib/utils'
import Meter from './Meter'
import SectionHeading, { SectionLink } from './SectionHeading'
import type { WatchlistItemData } from '@/types'

function progressLabel(item: WatchlistItemData) {
  if (item.currentSeason && item.currentEpisode) return `Season ${item.currentSeason}, episode ${item.currentEpisode}`
  if (item.progressPercent > 0) return `${item.progressPercent}% watched`
  return 'Just started'
}

function PreviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {[0, 1].map(row => (
        <div key={row} className="flex items-center gap-4">
          <Skeleton className="h-20 w-14 flex-shrink-0 rounded-lg bg-ns-surface-2" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 bg-ns-surface-2" />
            <Skeleton className="h-2 w-full bg-ns-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function WatchlistPreview({ className }: { className?: string }) {
  const [items,    setItems]    = useState<WatchlistItemData[]>([])
  const [watching, setWatching] = useState<WatchlistItemData[]>([])
  const [stats,    setStats]    = useState({ total: 0, watched: 0, wantToWatch: 0 })
  const [loading,  setLoading]  = useState(true)
  const [failed,   setFailed]   = useState(false)
  const [attempt,  setAttempt]  = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)

    Promise.all([
      fetch('/api/watchlist?status=want_to_watch&sortBy=addedAt&stats=true').then(r => {
        if (!r.ok) throw new Error('Watchlist request failed')
        return r.json()
      }),
      fetch('/api/watchlist?status=watching')
        .then(r => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] })),
    ])
      .then(([saved, inProgress]) => {
        if (!active) return
        setItems((saved.items ?? []).slice(0, 5))
        if (saved.stats) setStats(saved.stats)
        setWatching((inProgress.items ?? []).slice(0, 3))
      })
      .catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [attempt])

  const hasProgress = watching.length > 0
  const remaining = stats.wantToWatch - items.length
  // Keep one grid cell free for the "+N" tile when the list is longer than the row.
  const shelf = remaining > 0 ? items.slice(0, 4) : items
  const hiddenCount = stats.wantToWatch - shelf.length

  return (
    <div className={cn('flex min-w-0 flex-col', hasProgress && 'max-lg:order-first', className)}>
      <SectionHeading
        id="continue-watching-title"
        title={hasProgress ? 'Continue watching' : 'Up next'}
        action={<SectionLink href="/watchlist">View all</SectionLink>}
      />

      <section aria-labelledby="continue-watching-title" className="flex flex-1 flex-col rounded-2xl bg-ns-surface p-6">
        {loading ? (
          <PreviewSkeleton />
        ) : failed ? (
          <div role="alert" className="flex flex-1 flex-col items-start justify-center gap-4">
            <p className="text-base text-ns-muted">Your watchlist could not load.</p>
            <Button variant="secondary" onClick={() => setAttempt(value => value + 1)} className="bg-ns-surface-2 hover:bg-ns-surface-3">Try again</Button>
          </div>
        ) : !hasProgress && items.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4">
            <p className="text-base text-ns-muted">Your watchlist is empty.</p>
            <Button variant="secondary" href="/discover" className="bg-ns-surface-2 hover:bg-ns-surface-3">Discover movies</Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5 motion-safe:animate-fade-up">
            {hasProgress && (
              <ul className="divide-y divide-ns-border">
                {watching.map((item, index) => (
                  <li key={item.tmdbId}>
                    <Link href={`/movie/${item.tmdbId}`} className="group flex items-center gap-4 py-3 first:pt-0">
                      <span className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-2">
                        <Image
                          src={tmdbImageUrl(item.posterPath, 'w185')}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-sm tabular-nums text-ns-muted">{progressLabel(item)}</span>
                        <Meter value={item.progressPercent} index={index} className="mt-2 h-1.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {shelf.length > 0 && (
              <div className="mt-auto">
                {hasProgress && <p className="mb-2 text-sm font-semibold text-ns-text">Up next</p>}
                <ul className="grid grid-cols-5 gap-2">
                  {shelf.map(item => (
                    <li key={item.tmdbId}>
                      <Link href={`/movie/${item.tmdbId}`} aria-label={item.title} className="group relative block aspect-[2/3] overflow-hidden rounded-lg bg-ns-surface-2">
                        <Image
                          src={tmdbImageUrl(item.posterPath, 'w185')}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 90px, 18vw"
                          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                        />
                      </Link>
                    </li>
                  ))}
                  {hiddenCount > 0 ? (
                    <li>
                      <Link
                        href="/watchlist"
                        aria-label={`View ${hiddenCount} more saved movies`}
                        className="flex aspect-[2/3] items-center justify-center rounded-lg bg-ns-surface-2 text-sm font-semibold tabular-nums text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
                      >
                        +{hiddenCount}
                      </Link>
                    </li>
                  ) : shelf.length < 5 && (
                    <li>
                      <Link
                        href="/discover"
                        aria-label="Find more movies to save"
                        className="flex aspect-[2/3] items-center justify-center rounded-lg bg-ns-surface-2 text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text"
                      >
                        <PlusIcon size={18} />
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-sm tabular-nums text-ns-muted">
              {stats.total} total · {stats.watched} watched
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
