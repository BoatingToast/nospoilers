'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import type { WatchlistItemData, WatchStatus } from '@/types'
import { FilmIcon, ArrowRightIcon } from '@/components/icons'
import WatchlistRoulette from './WatchlistRoulette'
import WatchlistKnockout from './WatchlistKnockout'

interface Props {
  initialItems:   WatchlistItemData[]
  initialStatus:  string
  initialSortBy:  string
}

const STATUS_FILTERS = [
  { value: 'all',           label: 'All' },
  { value: 'want_to_watch', label: 'Want to Watch' },
  { value: 'watching',      label: 'Watching' },
  { value: 'watched',       label: 'Watched' },
]

const SORT_OPTIONS = [
  { value: 'addedAt',    label: 'Date Added' },
  { value: 'title',      label: 'Title' },
  { value: 'year',       label: 'Year' },
  { value: 'rating',     label: 'TMDb Rating' },
  { value: 'matchScore', label: 'Match Score' },
]

const STATUS_BADGE: Record<WatchStatus, { label: string; cls: string }> = {
  want_to_watch: { label: 'Want to Watch', cls: 'bg-ns-surface-2 text-ns-muted border-ns-border' },
  watching:      { label: 'Watching',      cls: 'bg-ns-secondary/10 text-ns-secondary border-ns-secondary/20' },
  watched:       { label: 'Watched',       cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

export default function WatchlistGrid({ initialItems, initialStatus, initialSortBy }: Props) {
  const [items,    setItems]    = useState<WatchlistItemData[]>(initialItems)
  const [status,   setStatus]   = useState(initialStatus)
  const [sortBy,   setSortBy]   = useState(initialSortBy)
  const [loading,  setLoading]  = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const unwatchedMovies = items.filter(item => item.status === 'want_to_watch')

  async function fetchItems(newStatus: string, newSort: string) {
    setLoading(true)
    const params = new URLSearchParams({ sortBy: newSort, stats: 'false' })
    if (newStatus !== 'all') params.set('status', newStatus)
    const res  = await fetch(`/api/watchlist?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  function handleStatusChange(s: string) {
    setStatus(s)
    fetchItems(s, sortBy)
  }

  function handleSortChange(s: string) {
    setSortBy(s)
    fetchItems(status, s)
  }

  async function updateStatus(tmdbId: number, newStatus: WatchStatus) {
    setUpdating(String(tmdbId))
    await fetch(`/api/watchlist/${tmdbId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    await fetchItems(status, sortBy)
    setUpdating(null)
  }

  async function removeItem(tmdbId: number) {
    await fetch(`/api/watchlist/${tmdbId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.tmdbId !== tmdbId))
  }

  return (
    <div>
      <WatchlistRoulette movies={unwatchedMovies} />
      <WatchlistKnockout movies={items} />

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              type="button"
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              aria-pressed={status === f.value}
              className={`min-h-11 rounded-full px-4 py-2 text-xs font-body transition-all
                ${status === f.value
                  ? 'bg-ns-secondary text-ns-bg font-medium'
                  : 'border border-ns-border text-ns-muted hover:border-ns-muted/40'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          aria-label="Sort watchlist"
          className="min-h-11 rounded-xl border border-ns-border bg-ns-surface px-3 py-2 text-xs font-body text-ns-muted focus:border-ns-secondary/40 focus:outline-none"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-ns-border mb-2" />
              <div className="h-3 bg-ns-border rounded w-3/4 mb-1" />
              <div className="h-2.5 bg-ns-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
          <FilmIcon size={44} className="text-ns-secondary/40 mx-auto mb-4" />
          <p className="text-ns-muted font-body text-sm">Nothing here yet.</p>
          <Link href="/discover" className="text-ns-secondary text-sm font-body mt-2 inline-flex items-center gap-1 hover:underline">
            Discover movies <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => {
            const badge = STATUS_BADGE[item.status]
            const isUpdating = updating === String(item.tmdbId)
            return (
              <div key={item.tmdbId} className="group touch-action-group relative">
                <Link href={`/movie/${item.tmdbId}`}>
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border relative">
                    <Image
                      src={tmdbImageUrl(item.posterPath, 'w342')}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                    />
                    {item.matchScore && (
                      <div className="absolute top-2 right-2 bg-ns-bg/80 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <span className="text-ns-secondary text-[10px] font-body font-bold">{item.matchScore}%</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Status badge + quick actions */}
                <div className="mt-2">
                  <p className="text-ns-text text-xs font-body font-medium truncate mb-1">{item.title}</p>
                  <p className="text-ns-muted/50 text-[10px] font-body mb-1.5">{formatYear(item.releaseDate)}</p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-body border rounded-full px-2 py-0.5 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Quick action */}
                  <div className="touch-action-reveal mt-2 flex gap-1 transition-opacity">
                    {item.status !== 'watched' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item.tmdbId, 'watched')}
                        disabled={isUpdating}
                        className="min-h-11 flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-xs font-body text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isUpdating ? 'Updating…' : 'Watched'}
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
                      onClick={() => removeItem(item.tmdbId)}
                      aria-label={`Remove ${item.title} from watchlist`}
                      title="Remove from watchlist"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-base text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
