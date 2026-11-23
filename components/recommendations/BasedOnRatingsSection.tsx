'use client'

import { useEffect, useState } from 'react'
import PosterRail from '@/components/discover/PosterRail'
import PosterTile from '@/components/discover/PosterTile'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RatingRec } from '@/types'

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

  const heading = (
    <>
      <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Based on your ratings</h2>
      <p className="mt-1.5 text-base text-ns-muted">
        Films TMDb recommends based on movies you&apos;ve rated 85 or higher
      </p>
    </>
  )

  if (loading) {
    return (
      <section aria-busy="true">
        <div className="mb-5">{heading}</div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0">
              <Skeleton className="aspect-[2/3] rounded-xl" />
              <Skeleton className="mt-2.5 h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-3.5 w-3/5" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="ns-reveal">
      <PosterRail label="Based on your ratings" controlsLabel="rating picks" heading={heading}>
        {recs.map(rec => (
          <div key={rec.tmdbId} className="w-36 flex-shrink-0 snap-start">
            <PosterTile
              href={`/movie/${rec.tmdbId}`}
              title={rec.title}
              posterPath={rec.posterPath}
              badge={`${rec.matchScore}%`}
              note={rec.because.length > 0 ? `Because of ${rec.because[0].title} (${rec.because[0].score})` : undefined}
              sizes="144px"
            />
          </div>
        ))}
      </PosterRail>
    </section>
  )
}
