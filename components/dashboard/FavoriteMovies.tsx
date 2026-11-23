'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import Top5Editor from '@/components/top-five/Top5Editor'
import { EditIcon, FilmIcon, PlusIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import SectionHeading from './SectionHeading'
import type { TopFiveEntry } from '@/services/top-five'

// Props kept minimal — no longer needs favorites passed from server
// since it fetches Top 5 client-side (always fresh)
export default function FavoriteMovies() {
  const [movies,   setMovies]   = useState<TopFiveEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/top-five')
      .then(r => r.json())
      .then(d => setMovies(d.movies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fetchKey])

  function handleSaved(saved: TopFiveEntry[]) {
    setEditing(false)
    setMovies(saved)
    setFetchKey(k => k + 1)
  }

  return (
    <>
      <section aria-labelledby="top-five-title">
        <SectionHeading
          id="top-five-title"
          title="Top 5 films"
          action={<Button variant="ghost" size="sm" onClick={() => setEditing(true)}><EditIcon size={14} /> Edit Top 5</Button>}
        />

        {loading ? (
          <div aria-hidden="true" className="grid grid-cols-5 gap-2 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            title="No Top 5 set yet"
            description="Your Top 5 films are the strongest influence on your Movie DNA and recommendations."
            action={<Button onClick={() => setEditing(true)}>Choose Your Top 5</Button>}
          />
        ) : (
          <ol className="grid grid-cols-5 gap-2 sm:gap-4">
            {movies.map((m, index) => (
              <li key={m.tmdbId} className="ns-reveal min-w-0" style={{ '--i': index } as React.CSSProperties}>
                <Link href={`/movie/${m.tmdbId}`} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                    {m.posterPath ? (
                      <Image
                        src={tmdbImageUrl(m.posterPath, 'w342')}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 240px, 19vw"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FilmIcon size={28} className="text-ns-muted" />
                      </div>
                    )}
                    <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 font-display text-xs text-white sm:left-2 sm:top-2 sm:h-8 sm:w-8 sm:text-sm">
                      {m.position}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable sm:text-sm">
                    {m.title}
                  </p>
                  {m.releaseDate && <p className="hidden text-sm tabular-nums text-ns-muted sm:block">{formatYear(m.releaseDate)}</p>}
                </Link>
              </li>
            ))}

            {Array.from({ length: 5 - movies.length }).map((_, i) => (
              <li key={`empty-${i}`}>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Add a film to your Top 5"
                  className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-ns-surface text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text"
                >
                  <PlusIcon size={20} />
                </button>
              </li>
            ))}
          </ol>
        )}

        {movies.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-ns-muted">
            <span>Your Top 5 contributes <span className="font-semibold text-ns-text">35%</span> of your Movie DNA</span>
            <button type="button" onClick={() => setEditing(true)} className="min-h-10 font-semibold text-ns-text underline underline-offset-4 transition-colors hover:text-ns-secondary-readable">
              Edit order
            </button>
          </p>
        )}
      </section>

      {editing && (
        <Top5Editor
          initialMovies={movies}
          onSaved={handleSaved}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
