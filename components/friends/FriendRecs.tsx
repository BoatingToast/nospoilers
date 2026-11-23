'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { FriendRec } from '@/types'
import { FilmIcon } from '@/components/icons'

function Skeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-36 flex-shrink-0 animate-pulse sm:w-44">
          <div className="aspect-[2/3] rounded-xl bg-ns-surface" />
          <div className="mt-2.5 h-4 w-4/5 rounded-sm bg-ns-surface" />
          <div className="mt-1.5 h-3.5 w-3/5 rounded-sm bg-ns-surface" />
        </div>
      ))}
    </div>
  )
}

export default function FriendRecs() {
  const [recs,    setRecs]    = useState<FriendRec[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/friends/recommendations')
      .then(r => r.json())
      .then(data => setRecs(data.recs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && recs.length === 0) return null

  return (
    <section>
      <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Because your friends loved it</h2>
      <p className="mt-1 text-base text-ns-muted">
        Films rated highly by people with similar taste to you
      </p>

      <div className="mt-5">
        {loading ? <Skeleton /> : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
            {recs.map((rec, index) => (
              <Link
                key={rec.tmdbId}
                href={`/movie/${rec.tmdbId}`}
                className="ns-reveal group block w-36 flex-shrink-0 snap-start rounded-xl sm:w-44"
                style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                  {rec.posterPath ? (
                    <Image
                      src={tmdbImageUrl(rec.posterPath, 'w342')}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 176px, 144px"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FilmIcon size={32} className="text-ns-muted" />
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                    {rec.matchScore}%
                  </span>
                </div>

                <p className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {rec.title}
                </p>
                {rec.friendRatings.slice(0, 2).map(fr => (
                  <p key={fr.username} className="truncate text-sm text-ns-muted">
                    @{fr.username} <span className="font-semibold tabular-nums text-ns-text">{fr.score}</span>
                  </p>
                ))}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
