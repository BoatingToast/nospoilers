'use client'

import { useEffect, useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import PosterTile, { posterGridClass } from './PosterTile'

interface RatingItem {
  tmdbId:     number
  title:      string
  posterPath: string | null
  score:      number
  createdAt:  string
  review:     string | null
}

type Sort = 'date' | 'score_desc' | 'score_asc'

function timeAgo(iso: string) {
  const d   = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30)  return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export default function ProfileRatingsTab({ username }: { username: string }) {
  const [ratings,  setRatings]  = useState<RatingItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [blocked,  setBlocked]  = useState(false)
  const [sort,     setSort]     = useState<Sort>('date')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/profile/${username}/tabs?tab=ratings&sort=${sort}`)
      .then(r => {
        if (r.status === 403) { setBlocked(true); return null }
        return r.json()
      })
      .then(data => {
        if (data) setRatings(data.ratings ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username, sort])

  if (blocked) {
    return <EmptyState title="This user's ratings are private." />
  }

  return (
    <div>
      <div role="group" aria-label="Sort ratings" className="mb-6 flex flex-wrap items-center gap-1">
        {(['date', 'score_desc', 'score_asc'] as Sort[]).map(s => (
          <button
            key={s}
            type="button"
            aria-pressed={sort === s}
            onClick={() => setSort(s)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 sm:min-h-10
              ${sort === s ? 'bg-ns-surface-3 text-ns-text' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'}`}
          >
            {s === 'date' ? 'Recent' : s === 'score_desc' ? 'Highest' : 'Lowest'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={posterGridClass}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-ns-surface" />
              <div className="mt-2.5 h-4 w-4/5 rounded-sm bg-ns-surface" />
              <div className="mt-1.5 h-3.5 w-2/5 rounded-sm bg-ns-surface" />
            </div>
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <EmptyState title="No ratings yet." />
      ) : (
        <div key={sort} className={`${posterGridClass} animate-fade-up`}>
          {ratings.map((r, index) => (
            <PosterTile
              key={r.tmdbId}
              index={index}
              tmdbId={r.tmdbId}
              title={r.title}
              posterPath={r.posterPath}
              meta={timeAgo(r.createdAt)}
              overlay={
                <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-0.5 text-sm font-bold tabular-nums text-white">
                  {r.score}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
