'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TopFiveEntry } from '@/services/top-five'
import { FilmIcon, EditIcon } from '@/components/icons'

interface Props {
  userId:      string
  isOwn:       boolean
  onEditClick?: () => void
}

const RANK_LABELS: Record<number, string> = {
  1: '1ST', 2: '2ND', 3: '3RD', 4: '4TH', 5: '5TH',
}

export default function Top5Display({ userId, isOwn, onEditClick }: Props) {
  const [movies,  setMovies]  = useState<TopFiveEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/top-five?userId=${userId}`)
      .then(r => r.json())
      .then(d => setMovies(d.movies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl tracking-wider text-ns-text">TOP 5 FILMS</h2>
        {isOwn && (
          <button
            onClick={onEditClick}
            className="text-xs font-heading font-medium text-ns-gold hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <EditIcon size={12} />
            Edit Top 5
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 aspect-[2/3] animate-pulse rounded-xl bg-ns-surface border border-ns-border" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ns-border p-10 text-center">
          <FilmIcon size={44} className="text-ns-gold/30 mx-auto mb-3" />
          <p className="font-heading font-medium text-white mb-1">No Top 5 yet</p>
          <p className="text-ns-muted text-sm font-body mb-4">
            {isOwn
              ? 'Pick your 5 all-time favourite films — they\'ll shape your Movie DNA.'
              : 'This user hasn\'t set their Top 5 yet.'
            }
          </p>
          {isOwn && (
            <button
              onClick={onEditClick}
              className="px-5 py-2 rounded-xl bg-ns-gold text-ns-bg text-sm font-heading font-semibold hover:bg-amber-400 transition-colors"
            >
              Choose Your Top 5
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2 sm:gap-3">
          {movies.map(m => (
            <Link
              key={m.tmdbId}
              href={`/movie/${m.tmdbId}`}
              className="relative flex-1 group"
            >
              {/* Rank badge */}
              <div className="absolute -top-2 -left-1 z-10 w-7 h-7 rounded-full bg-ns-bg border-2 border-ns-gold
                              flex items-center justify-center shadow-lg">
                <span className="text-ns-gold font-display text-[9px] leading-none tracking-wider">
                  {m.position}
                </span>
              </div>

              {/* Poster */}
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                              shadow-lg group-hover:border-ns-gold/50 transition-all duration-200
                              group-hover:shadow-ns-gold/10 group-hover:shadow-xl">
                {m.posterPath ? (
                  <Image
                    src={tmdbImageUrl(m.posterPath, 'w342')}
                    alt={m.title}
                    fill
                    sizes="(max-width: 640px) 18vw, 160px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/30" />
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                flex items-end p-2">
                  <div className="w-full">
                    <p className="text-white text-[10px] font-heading font-semibold leading-tight line-clamp-2">{m.title}</p>
                    {m.releaseDate && (
                      <p className="text-white/60 text-[9px] font-body mt-0.5">{formatYear(m.releaseDate)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Title below poster */}
              <p className="text-[10px] sm:text-[11px] font-body text-ns-muted mt-1.5 line-clamp-1 group-hover:text-white transition-colors text-center">
                {m.title}
              </p>
            </Link>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 5 - movies.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1">
              <button
                onClick={isOwn ? onEditClick : undefined}
                className={`w-full aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center
                            ${isOwn
                              ? 'border-ns-border hover:border-ns-gold/40 cursor-pointer transition-colors'
                              : 'border-ns-border cursor-default'
                            }`}
              >
                {isOwn && <span className="text-ns-muted text-lg">+</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
