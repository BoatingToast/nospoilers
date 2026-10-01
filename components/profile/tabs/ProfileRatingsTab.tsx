'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { LockIcon, FilmIcon } from '@/components/icons'

interface RatingItem {
  tmdbId:     number
  title:      string
  posterPath: string | null
  score:      number
  createdAt:  string
  review:     string | null
}

type Sort = 'date' | 'score_desc' | 'score_asc'

function scoreColor(s: number) {
  if (s >= 85) return 'text-ns-secondary-readable'
  if (s >= 70) return 'text-emerald-400'
  if (s >= 50) return 'text-blue-400'
  return 'text-ns-muted'
}

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
    return (
      <p className="flex items-center gap-2 border-t border-ns-border py-6 text-sm font-body text-ns-muted">
        <LockIcon size={16} className="flex-shrink-0" /> This user's ratings are private.
      </p>
    )
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="text-ns-muted text-xs font-body">Sort:</span>
        {(['date', 'score_desc', 'score_asc'] as Sort[]).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`min-h-[40px] text-sm font-body underline-offset-4 transition-colors
              ${sort === s ? 'text-ns-secondary-readable underline' : 'text-ns-muted hover:text-ns-text hover:underline'}`}
          >
            {s === 'date' ? 'Recent' : s === 'score_desc' ? 'Highest' : 'Lowest'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-ns-border rounded mb-2" />
              <div className="h-3 bg-ns-border rounded w-4/5 mb-1" />
              <div className="h-2 bg-ns-border rounded w-2/5" />
            </div>
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <p className="border-t border-ns-border py-6 text-sm font-body text-ns-muted">No ratings yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {ratings.map(r => (
            <Link key={r.tmdbId} href={`/movie/${r.tmdbId}`} className="group">
              <div className="relative aspect-[2/3] rounded overflow-hidden bg-ns-border mb-2">
                {r.posterPath ? (
                  <Image
                    src={tmdbImageUrl(r.posterPath, 'w342')}
                    alt={r.title}
                    fill
                    sizes="200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={32} className="text-ns-muted/40" />
                  </div>
                )}
                {/* Score badge */}
                <div className="absolute top-2 right-2 bg-black/70 rounded-sm px-1.5 py-0.5">
                  <span className={`text-xs font-body font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                </div>
              </div>
              <p className="text-xs font-body text-white line-clamp-1 group-hover:text-ns-secondary-readable transition-colors">{r.title}</p>
              <p className="text-[11px] font-body text-ns-muted mt-0.5">{timeAgo(r.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
