'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { FriendRec } from '@/types'
import { FilmIcon } from '@/components/icons'
import Section from '@/components/ui/Section'

function Skeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[150px] flex-shrink-0 animate-pulse">
          <div className="mb-2 h-[225px] w-[150px] rounded bg-ns-border" />
          <div className="mb-1 h-3 w-4/5 rounded bg-ns-border" />
          <div className="h-2 w-3/5 rounded bg-ns-border" />
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
    <Section
      title="Because Your Friends Loved It"
      note="Films rated highly by people with similar taste to you"
    >
      {/* Shelf */}
      {loading ? (
        <Skeleton />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {recs.map(rec => (
            <Link key={rec.tmdbId} href={`/movie/${rec.tmdbId}`} className="group w-[150px] flex-shrink-0">
              {/* Poster */}
              <div className="relative mb-2 h-[225px] w-[150px] overflow-hidden rounded border border-ns-border bg-ns-border transition-colors group-hover:border-ns-text/60">
                {rec.posterPath ? (
                  <Image
                    src={tmdbImageUrl(rec.posterPath, 'w342')}
                    alt={rec.title}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FilmIcon size={32} className="text-ns-muted/40" />
                  </div>
                )}
              </div>

              {/* Title */}
              <p className="mb-1 line-clamp-1 font-body text-sm text-ns-text group-hover:underline group-hover:underline-offset-4">
                {rec.title}
              </p>

              {/* Match score */}
              <p className="font-body text-xs font-medium text-ns-secondary-readable">{rec.matchScore}%</p>

              {/* Friend attribution */}
              <div className="mt-0.5 space-y-0.5">
                {rec.friendRatings.slice(0, 2).map(fr => (
                  <p key={fr.username} className="truncate font-body text-[11px] text-ns-muted">
                    <span className="text-ns-text">@{fr.username}</span>
                    {' '}<span className="text-ns-secondary-readable">{fr.score}</span>
                  </p>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  )
}
