'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { RatingRec } from '@/types'
import { RatingsIcon, FilmIcon } from '@/components/icons'

// ─── Card ─────────────────────────────────────────────────────────────────────

function RatingRecCard({ rec }: { rec: RatingRec }) {
  const posterSrc = rec.posterPath ? tmdbImageUrl(rec.posterPath, 'w342') : null

  const matchColor =
    rec.matchScore >= 85 ? 'text-emerald-400' :
    rec.matchScore >= 70 ? 'text-ns-gold' :
    'text-ns-muted'

  return (
    <Link href={`/movie/${rec.tmdbId}`} className="group flex-shrink-0 w-[140px]">
      {/* Poster */}
      <div className="relative w-[140px] h-[210px] rounded-xl overflow-hidden bg-ns-border mb-2">
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={rec.title}
            fill
            sizes="140px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FilmIcon size={32} className="text-ns-muted/40" />
          </div>
        )}
        {/* Match score badge */}
        <div className="absolute top-2 right-2 bg-black/70 rounded-full px-1.5 py-0.5">
          <span className={`text-[10px] font-body font-medium ${matchColor}`}>
            {rec.matchScore}%
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="text-xs font-body text-white line-clamp-2 mb-1 group-hover:text-ns-gold transition-colors">
        {rec.title}
      </p>

      {/* Explanation */}
      {rec.because.length > 0 && (
        <p className="text-[10px] font-body text-ns-muted line-clamp-2">
          ↳ {rec.because[0].title} ({rec.because[0].score})
        </p>
      )}
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex gap-3 overflow-hidden p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[140px] flex-shrink-0 animate-pulse">
          <div className="w-[140px] h-[210px] rounded-xl bg-ns-border mb-2" />
          <div className="h-3 bg-ns-border rounded w-4/5 mb-1" />
          <div className="h-2 bg-ns-border rounded w-3/5" />
        </div>
      ))}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function BasedOnRatingsSection() {
  const [recs,    setRecs]    = useState<RatingRec[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recommendations/rating-recs')
      .then(r => r.ok ? r.json() : { recs: [] })
      .then(data => setRecs(Array.isArray(data.recs) ? data.recs : []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false))
  }, [])

  // If not loading and no results — section is invisible (user has no high-rated films yet)
  if (!loading && recs.length === 0) return null

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-ns-border">
        <div className="flex items-center gap-2 mb-0.5">
          <RatingsIcon size={16} className="text-ns-gold flex-shrink-0" />
          <h2 className="text-sm font-heading text-white">Based On Your Ratings</h2>
        </div>
        <p className="text-[11px] font-body text-ns-muted">
          Films TMDb recommends based on movies you&apos;ve rated 85 or higher
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : (
        <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide">
          {recs.map(rec => (
            <RatingRecCard key={rec.tmdbId} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
