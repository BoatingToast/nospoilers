'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { FriendRec } from '@/types'
import { FriendsIcon, FilmIcon } from '@/components/icons'

function Skeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[150px] flex-shrink-0 animate-pulse">
          <div className="w-[150px] h-[225px] rounded-xl bg-ns-border mb-2" />
          <div className="h-3 bg-ns-border rounded w-4/5 mb-1" />
          <div className="h-2 bg-ns-border rounded w-3/5" />
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
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-ns-border">
        <div className="flex items-center gap-2 mb-0.5">
          <FriendsIcon size={16} className="text-ns-gold flex-shrink-0" />
          <h2 className="text-sm font-heading text-white">Because Your Friends Loved It</h2>
        </div>
        <p className="text-[11px] font-body text-ns-muted">
          Films rated highly by people with similar taste to you
        </p>
      </div>

      {/* Shelf */}
      {loading ? (
        <div className="p-4"><Skeleton /></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto p-4 scrollbar-hide">
          {recs.map(rec => (
            <Link key={rec.tmdbId} href={`/movie/${rec.tmdbId}`} className="group flex-shrink-0 w-[150px]">
              {/* Poster */}
              <div className="relative w-[150px] h-[225px] rounded-xl overflow-hidden bg-ns-border mb-2">
                {rec.posterPath ? (
                  <Image
                    src={tmdbImageUrl(rec.posterPath, 'w342')}
                    alt={rec.title}
                    fill
                    sizes="150px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={32} className="text-ns-muted/40" />
                  </div>
                )}
                {/* Match badge */}
                <div className="absolute top-2 right-2 bg-black/70 rounded-full px-1.5 py-0.5">
                  <span className="text-[10px] font-body font-medium text-ns-gold">{rec.matchScore}%</span>
                </div>
              </div>

              {/* Title */}
              <p className="text-xs font-body text-white line-clamp-1 group-hover:text-ns-gold transition-colors mb-1">
                {rec.title}
              </p>

              {/* Friend attribution */}
              <div className="space-y-0.5">
                {rec.friendRatings.slice(0, 2).map(fr => (
                  <p key={fr.username} className="text-[10px] font-body text-ns-muted">
                    <span className="text-white/60">@{fr.username}</span>
                    {' '}<span className="text-ns-gold">{fr.score}</span>
                  </p>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
