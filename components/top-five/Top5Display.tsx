'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TopFiveEntry } from '@/services/top-five'
import { FilmIcon, EditIcon, PlusIcon } from '@/components/icons'

interface Props {
  userId:      string
  isOwn:       boolean
  onEditClick?: () => void
}

const slotClass = 'w-28 flex-shrink-0 snap-start sm:w-auto'

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
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl text-ns-text">Top 5 films</h2>
        {isOwn && movies.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onEditClick}>
            <EditIcon size={14} />
            Edit Top 5
          </Button>
        )}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading Top 5" className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={`${slotClass} aspect-[2/3] rounded-xl`} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title="No Top 5 yet"
          description={isOwn
            ? 'Pick your 5 all-time favourite films — they\'ll shape your Movie DNA.'
            : 'This user hasn\'t set their Top 5 yet.'}
          action={isOwn ? <Button onClick={onEditClick}>Choose Your Top 5</Button> : undefined}
        />
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {movies.map((m, index) => (
            <div key={m.tmdbId} className={`ns-reveal ${slotClass}`} style={{ '--i': index } as React.CSSProperties}>
              <Link href={`/movie/${m.tmdbId}`} aria-label={`Number ${m.position}: ${m.title}`} className="group block min-w-0">
                <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
                  {m.posterPath ? (
                    <Image
                      src={tmdbImageUrl(m.posterPath, 'w342')}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 112px, 200px"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <FilmIcon size={28} className="text-ns-subtle" />
                    </span>
                  )}
                  <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-bold tabular-nums text-white">
                    {m.position}
                  </span>
                </span>
                <span className="mt-2 block truncate font-heading text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {m.title}
                </span>
                {m.releaseDate && (
                  <span className="block text-xs tabular-nums text-ns-muted">{formatYear(m.releaseDate)}</span>
                )}
              </Link>
            </div>
          ))}

          {Array.from({ length: 5 - movies.length }).map((_, i) => (
            <div key={`empty-${i}`} className={slotClass}>
              {isOwn ? (
                <button
                  type="button"
                  onClick={onEditClick}
                  aria-label="Add a film to your Top 5"
                  className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-ns-surface text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text"
                >
                  <PlusIcon size={20} />
                </button>
              ) : (
                <div aria-hidden="true" className="aspect-[2/3] w-full rounded-xl bg-ns-surface" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
