'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import type { WatchlistItemData, WatchStatus } from '@/types'
import { FilmIcon, ArrowRightIcon } from '@/components/icons'

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
  watching:      { label: 'Watching',      cls: 'bg-ns-gold/10 text-ns-gold border-ns-gold/20' },
  watched:       { label: 'Watched',       cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

export default function WatchlistGrid({ initialItems, initialStatus, initialSortBy }: Props) {
  const [items,    setItems]    = useState<WatchlistItemData[]>(initialItems)
  const [status,   setStatus]   = useState(initialStatus)
  const [sortBy,   setSortBy]   = useState(initialSortBy)
  const [loading,  setLoading]  = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

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
      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-body transition-all
                ${status === f.value
                  ? 'bg-ns-gold text-ns-bg font-medium'
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
          className="bg-ns-surface border border-ns-border text-ns-muted text-xs font-body px-3 py-1.5 rounded-xl focus:outline-none focus:border-ns-gold/40"
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
          <FilmIcon size={44} className="text-ns-gold/40 mx-auto mb-4" />
          <p className="text-ns-muted font-body text-sm">Nothing here yet.</p>
          <Link href="/discover" className="text-ns-gold text-sm font-body mt-2 inline-flex items-center gap-1 hover:underline">
            Discover movies <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => {
            const badge = STATUS_BADGE[item.status]
            const isUpdating = updating === String(item.tmdbId)
            return (
              <div key={item.tmdbId} className="group relative">
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
                        <span className="text-ns-gold text-[10px] font-body font-bold">{item.matchScore}%</span>
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
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.status !== 'watched' && (
                      <button
                        onClick={() => updateStatus(item.tmdbId, 'watched')}
                        disabled={isUpdating}
                        className="flex-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-body hover:bg-emerald-500/20 transition-colors"
                      >
                        {isUpdating ? '...' : 'Watched'}
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
                      onClick={() => removeItem(item.tmdbId)}
                      className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    >
                      ×
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
