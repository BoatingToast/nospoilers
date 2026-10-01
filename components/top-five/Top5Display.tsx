'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TopFiveEntry } from '@/services/top-five'
import { FilmIcon, EditIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

interface Props {
  userId:      string
  isOwn:       boolean
  onEditClick?: () => void
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
    <Section
      title="TOP 5 FILMS"
      action={isOwn ? (
        <button
          onClick={onEditClick}
          className="flex min-h-[40px] items-center gap-1.5 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
        >
          <EditIcon size={12} />
          Edit Top 5
        </button>
      ) : undefined}
    >
      {loading ? (
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded bg-ns-surface border border-ns-border" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="border-t border-ns-border pt-4">
          <p className="font-heading font-medium text-white mb-1">No Top 5 yet</p>
          <p className="text-ns-muted text-sm font-body mb-4">
            {isOwn
              ? 'Pick your 5 all-time favourite films — they\'ll shape your Movie DNA.'
              : 'This user hasn\'t set their Top 5 yet.'
            }
          </p>
          {isOwn && (
            <Button variant="primary" onClick={onEditClick}>
              Choose Your Top 5
            </Button>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-5 gap-2 sm:gap-4">
          {movies.map(m => (
            <Link
              key={m.tmdbId}
              href={`/movie/${m.tmdbId}`}
              className="group min-w-0"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded overflow-hidden bg-ns-surface border border-ns-border
                              group-hover:border-ns-text/60 transition-colors duration-200">
                {m.posterPath ? (
                  <Image
                    src={tmdbImageUrl(m.posterPath, 'w342')}
                    alt={m.title}
                    fill
                    sizes="(max-width: 640px) 18vw, 220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/30" />
                  </div>
                )}
              </div>

              {/* Rank, title and year below poster */}
              <p className="mt-2 font-display text-xl leading-none tracking-wide text-ns-secondary-readable">
                {m.position}
              </p>
              <p className="mt-1 text-[11px] sm:text-sm font-body text-ns-muted line-clamp-2 sm:line-clamp-1 group-hover:text-white transition-colors">
                {m.title}
              </p>
              {m.releaseDate && (
                <p className="hidden sm:block text-xs font-body text-ns-muted">{formatYear(m.releaseDate)}</p>
              )}
            </Link>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 5 - movies.length }).map((_, i) => (
            <div key={`empty-${i}`} className="min-w-0">
              <button
                onClick={isOwn ? onEditClick : undefined}
                className={`w-full aspect-[2/3] rounded border border-dashed flex items-center justify-center
                            ${isOwn
                              ? 'border-ns-border hover:border-ns-text/60 cursor-pointer transition-colors'
                              : 'border-ns-border cursor-default'
                            }`}
              >
                {isOwn && <span className="text-ns-muted text-lg">+</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
