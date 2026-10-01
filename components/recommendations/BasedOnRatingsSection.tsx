'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
import type { RatingRec } from '@/types'
import Section from '@/components/ui/Section'
import { FilmIcon } from '@/components/icons'

// ─── Card ─────────────────────────────────────────────────────────────────────

function RatingRecCard({ rec }: { rec: RatingRec }) {
  const posterSrc = rec.posterPath ? tmdbImageUrl(rec.posterPath, 'w342') : null

  const matchColor =
    rec.matchScore >= 85 ? 'text-ns-success' :
    rec.matchScore >= 70 ? 'text-ns-secondary-readable' :
    'text-ns-muted'

  return (
    <Link href={`/movie/${rec.tmdbId}`} className="group flex-shrink-0 w-[140px]">
      {/* Poster */}
      <div className="relative mb-2 h-[210px] w-[140px] overflow-hidden rounded border border-ns-border bg-ns-surface-2 transition-colors group-hover:border-ns-text/60">
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={rec.title}
            fill
            sizes="140px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FilmIcon size={32} className="text-ns-muted/40" />
          </div>
        )}
      </div>

      {/* Title */}
      <p className="mb-1 font-body text-xs text-ns-text line-clamp-2 transition-colors group-hover:text-ns-secondary-readable">
        {rec.title}
      </p>

      {/* Match score */}
      <p className={`mb-1 font-body text-[11px] font-semibold ${matchColor}`}>
        {rec.matchScore}%
      </p>

      {/* Explanation */}
      {rec.because.length > 0 && (
        <p className="text-[11px] font-body text-ns-muted line-clamp-2">
          ↳ {rec.because[0].title} ({rec.because[0].score})
        </p>
      )}
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[140px] flex-shrink-0 animate-pulse">
          <div className="mb-2 h-[210px] w-[140px] rounded bg-ns-surface-2" />
          <div className="mb-1 h-3 w-4/5 rounded bg-ns-surface-2" />
          <div className="h-2 w-3/5 rounded bg-ns-surface-2" />
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
    <Section
      title="Based On Your Ratings"
      note={<>Films TMDb recommends based on movies you&apos;ve rated 85 or higher</>}
    >
      {loading ? (
        <Skeleton />
      ) : (
        <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
          {recs.map(rec => (
            <RatingRecCard key={rec.tmdbId} rec={rec} />
          ))}
        </div>
      )}
    </Section>
  )
}
