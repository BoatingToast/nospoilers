'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import { formatYear, cn } from '@/lib/utils'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WatchlistItemData, WatchStatus } from '@/types'
import { ArrowRightIcon, CheckIcon, CloseIcon } from '@/components/icons'
import WatchlistRoulette from './WatchlistRoulette'
import WatchlistKnockout from './WatchlistKnockout'
import {
  FilterInput,
  Meter,
  PillTabs,
  SortSelect,
  ViewToggle,
  posterGridClass,
  posterZoomClass,
  revealDelay,
  type LibraryView,
} from './LibraryControls'

interface WatchlistCounts {
  total: number
  wantToWatch: number
  watching: number
  watched: number
}

interface Props {
  initialItems:   WatchlistItemData[]
  initialStatus:  string
  initialSortBy:  string
  stats?:         WatchlistCounts
}

const SORT_OPTIONS = [
  { value: 'addedAt', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'rating', label: 'TMDb rating' },
  { value: 'matchScore', label: 'Match score' },
]

const STATUS_LABEL: Record<WatchStatus, string> = {
  want_to_watch: 'Want to watch',
  watching:      'Watching',
  watched:       'Watched',
}

const COUNT_KEY: Record<WatchStatus, keyof WatchlistCounts> = {
  want_to_watch: 'wantToWatch',
  watching:      'watching',
  watched:       'watched',
}

const EMPTY_STATUS_COPY: Record<string, { title: string; description: string }> = {
  want_to_watch: { title: 'Nothing queued up', description: 'Films you save for later will wait here.' },
  watching:      { title: 'Nothing in progress', description: 'Films you have started will show up here.' },
  watched:       { title: 'Nothing watched yet', description: 'Mark a film as watched and it moves here.' },
}

// On devices with a precise pointer the card actions float over the poster on hover.
const floatingActions = '[@media(hover:hover)_and_(pointer:fine)]:absolute [@media(hover:hover)_and_(pointer:fine)]:inset-x-2 [@media(hover:hover)_and_(pointer:fine)]:bottom-[4.25rem] [@media(hover:hover)_and_(pointer:fine)]:mt-0'

const actionIconClass = 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-2 text-ns-text transition-colors duration-150 hover:bg-ns-surface-3'

export default function WatchlistGrid({ initialItems, initialStatus, initialSortBy, stats }: Props) {
  const [items,    setItems]    = useState<WatchlistItemData[]>(initialItems)
  const [status,   setStatus]   = useState(initialStatus)
  const [sortBy,   setSortBy]   = useState(initialSortBy)
  const [counts,   setCounts]   = useState(stats)
  const [loading,  setLoading]  = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error,    setError]    = useState('')
  const [query,    setQuery]    = useState('')
  const [view,     setView]     = useState<LibraryView>('grid')
  const unwatchedMovies = items.filter(item => item.status === 'want_to_watch')

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? items.filter(item => item.title.toLowerCase().includes(needle)) : items
  }, [items, query])

  const hasAnyItems = (counts?.total ?? items.length) > 0

  async function fetchItems(newStatus: string, newSort: string) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ sortBy: newSort, stats: 'false' })
      if (newStatus !== 'all') params.set('status', newStatus)
      const res = await fetch(`/api/watchlist?${params}`)
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setError('Could not load your watchlist. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleStatusChange(s: string) {
    setStatus(s)
    fetchItems(s, sortBy)
  }

  function handleSortChange(s: string) {
    setSortBy(s)
    fetchItems(status, s)
  }

  async function updateStatus(item: WatchlistItemData, newStatus: WatchStatus) {
    setUpdating(String(item.tmdbId))
    setError('')
    try {
      const res = await fetch(`/api/watchlist/${item.tmdbId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Request failed')
      if (item.status !== newStatus) {
        setCounts(current => current && {
          ...current,
          [COUNT_KEY[item.status]]: Math.max(0, current[COUNT_KEY[item.status]] - 1),
          [COUNT_KEY[newStatus]]: current[COUNT_KEY[newStatus]] + 1,
        })
      }
      await fetchItems(status, sortBy)
    } catch {
      setError(`Could not update ${item.title}. Try again.`)
    } finally {
      setUpdating(null)
    }
  }

  async function removeItem(item: WatchlistItemData) {
    setError('')
    try {
      const res = await fetch(`/api/watchlist/${item.tmdbId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Request failed')
      setItems(prev => prev.filter(i => i.tmdbId !== item.tmdbId))
      setCounts(current => current && {
        ...current,
        total: Math.max(0, current.total - 1),
        [COUNT_KEY[item.status]]: Math.max(0, current[COUNT_KEY[item.status]] - 1),
      })
    } catch {
      setError(`Could not remove ${item.title}. Try again.`)
    }
  }

  const statusOptions = [
    { value: 'all', label: 'All', count: counts?.total },
    { value: 'want_to_watch', label: 'Want to watch', count: counts?.wantToWatch },
    { value: 'watching', label: 'Watching', count: counts?.watching },
    { value: 'watched', label: 'Watched', count: counts?.watched },
  ]

  return (
    <div>
      {hasAnyItems && (
        <section aria-labelledby="watchlist-decide" className="mb-10 flex items-center justify-between gap-8 rounded-3xl bg-ns-surface p-6 sm:p-8">
          <div className="min-w-0">
            <h2 id="watchlist-decide" className="font-heading text-2xl font-bold text-ns-text">
              Can&apos;t decide what to watch?
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
              {unwatchedMovies.length > 0
                ? <>Let NoSpoilers choose from {unwatchedMovies.length} unwatched {unwatchedMovies.length === 1 ? 'movie' : 'movies'}, or run a knockout to find a champion.</>
                : 'Select any movies, or your entire watchlist, then pick a champion.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <WatchlistRoulette movies={unwatchedMovies} />
              <WatchlistKnockout movies={items} />
            </div>
          </div>

          {unwatchedMovies.length > 0 && (
            <div aria-hidden="true" className="hidden flex-shrink-0 md:flex">
              {unwatchedMovies.slice(0, 5).map((movie, index) => (
                <div
                  key={movie.tmdbId}
                  className={cn(
                    'relative aspect-[2/3] w-24 overflow-hidden rounded-xl bg-ns-surface-2 ring-4 ring-ns-surface lg:w-28',
                    index > 0 && '-ml-10',
                    index > 2 && 'hidden lg:block',
                  )}
                >
                  <PosterFill path={movie.posterPath} size="w185" className="object-cover" sizes="112px" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PillTabs label="Filter by status" options={statusOptions} value={status} onChange={handleStatusChange} />
        <div className="flex flex-wrap items-center gap-2">
          <FilterInput
            label="Filter watchlist by title"
            placeholder="Filter by title"
            value={query}
            onChange={setQuery}
            className="min-w-0 flex-1 basis-full sm:basis-56"
          />
          <SortSelect label="Sort watchlist" value={sortBy} options={SORT_OPTIONS} onChange={handleSortChange} className="min-w-0 flex-1 sm:flex-none" />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ns-danger/10 px-4 py-2 text-sm text-ns-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchItems(status, sortBy)}
            className="min-h-11 rounded-full px-3 font-semibold transition-colors duration-150 hover:bg-ns-danger/15"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading watchlist" className={posterGridClass}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] rounded-xl" />
              <Skeleton className="mt-2.5 h-4 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        query.trim() ? (
          <EmptyState
            title={`No films match “${query.trim()}”`}
            description="Try another title, or clear the filter to see everything in this view."
            action={<Button variant="secondary" onClick={() => setQuery('')}>Clear filter</Button>}
          />
        ) : !hasAnyItems || status === 'all' ? (
          <EmptyState
            title="Nothing here yet"
            description="Save films you want to see. NoSpoilers keeps them safe until you get there."
            action={<Button href="/discover">Discover movies <ArrowRightIcon size={16} /></Button>}
          />
        ) : (
          <EmptyState
            title={EMPTY_STATUS_COPY[status]?.title ?? 'Nothing here yet'}
            description={EMPTY_STATUS_COPY[status]?.description}
            action={<Button variant="secondary" onClick={() => handleStatusChange('all')}>Show all films</Button>}
          />
        )
      ) : view === 'grid' ? (
        <div key={`${status}-${sortBy}`} className={cn(posterGridClass, 'animate-fade-up')}>
          {visibleItems.map((item, index) => {
            const isUpdating = updating === String(item.tmdbId)
            const inProgress = item.progressPercent > 0 && item.progressPercent < 100
            return (
              <div key={item.tmdbId} className={index > 5 ? 'ns-reveal' : undefined} style={index > 5 ? revealDelay(index) : undefined}>
                <article className="group touch-action-group relative min-w-0">
                  <Link href={`/movie/${item.tmdbId}`} aria-label={`View ${item.title}`} className="block min-w-0">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
                      <PosterFill
                        path={item.posterPath}
                        size="w342"
                        className={posterZoomClass}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                      />
                      {item.matchScore ? (
                        <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                          {item.matchScore}%
                        </span>
                      ) : null}
                      {item.status === 'watched' && (
                        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ns-success text-ns-bg">
                          <CheckIcon size={14} strokeWidth={3} />
                        </span>
                      )}
                      {inProgress && (
                        <div className="absolute inset-x-2 bottom-2">
                          <Meter value={item.progressPercent / 100} className="bg-black/60" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 h-[3.25rem] min-w-0">
                      <p className="truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm tabular-nums text-ns-muted">
                        {formatYear(item.releaseDate)} · {STATUS_LABEL[item.status]}
                      </p>
                    </div>
                  </Link>

                  <div className={cn('touch-action-reveal mt-2 flex items-center justify-end gap-1.5 transition-opacity duration-150', floatingActions)}>
                    {item.status !== 'watched' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item, 'watched')}
                        disabled={isUpdating}
                        aria-label={`Mark ${item.title} as watched`}
                        title="Mark as watched"
                        className={cn(
                          'mr-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ns-text text-ns-bg transition-colors duration-150 hover:bg-ns-muted disabled:cursor-wait',
                          isUpdating && 'animate-pulse',
                        )}
                      >
                        <CheckIcon size={17} strokeWidth={2.5} />
                      </button>
                    )}
                    <AddToCollectionButton
                      movie={{
                        tmdbId:      item.tmdbId,
                        title:       item.title,
                        posterPath:  item.posterPath,
                        releaseDate: item.releaseDate,
                      }}
                      compact
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      aria-label={`Remove ${item.title} from watchlist`}
                      title="Remove from watchlist"
                      className={cn(actionIconClass, 'hover:text-ns-danger')}
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      ) : (
        <ul key={`${status}-${sortBy}-list`} className="animate-fade-up divide-y divide-ns-border rounded-2xl bg-ns-surface px-3 sm:px-5">
          {visibleItems.map((item, index) => {
            const isUpdating = updating === String(item.tmdbId)
            return (
              <li key={item.tmdbId} className={index > 7 ? 'ns-reveal' : undefined} style={index > 7 ? revealDelay(index) : undefined}>
                <div className="group flex items-center gap-3 py-3 sm:gap-4">
                  <Link href={`/movie/${item.tmdbId}`} aria-label={`View ${item.title}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <div className="relative aspect-[2/3] w-12 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-2 sm:w-14">
                      <PosterFill path={item.posterPath} size="w185" className={posterZoomClass} sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm tabular-nums text-ns-muted">
                        {formatYear(item.releaseDate)}
                        {item.matchScore ? ` · ${item.matchScore}% match` : ''}
                      </p>
                    </div>
                  </Link>
                  <Badge
                    variant={item.status === 'watched' ? 'success' : item.status === 'watching' ? 'secondary' : 'muted'}
                    className="hidden sm:inline-flex"
                  >
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {item.status !== 'watched' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item, 'watched')}
                        disabled={isUpdating}
                        aria-label={`Mark ${item.title} as watched`}
                        title="Mark as watched"
                        className={cn(actionIconClass, 'hover:text-ns-success disabled:cursor-wait')}
                      >
                        <CheckIcon size={16} strokeWidth={2.5} />
                      </button>
                    )}
                    <span className="hidden sm:block">
                      <AddToCollectionButton
                        movie={{
                          tmdbId:      item.tmdbId,
                          title:       item.title,
                          posterPath:  item.posterPath,
                          releaseDate: item.releaseDate,
                        }}
                        compact
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      aria-label={`Remove ${item.title} from watchlist`}
                      title="Remove from watchlist"
                      className={cn(actionIconClass, 'hover:text-ns-danger')}
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
