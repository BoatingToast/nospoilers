'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import Top5Editor from '@/components/top-five/Top5Editor'
import { FilmIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
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
      <Section
        title="TOP 5 FILMS"
        action={
          <button
            onClick={() => setEditing(true)}
            className="font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
          >
            Edit Top 5
          </button>
        }
      >
        {loading ? (
          <div className="flex gap-2 sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] flex-1 animate-pulse rounded bg-ns-surface-2" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div>
            <p className="font-heading text-base font-medium text-ns-text">No Top 5 set yet</p>
            <p className="mt-1 max-w-2xl font-body text-sm leading-relaxed text-ns-muted">
              Your Top 5 films are the strongest influence on your Movie DNA and recommendations.
            </p>
            <Button variant="primary" onClick={() => setEditing(true)} className="mt-4">
              Choose Your Top 5
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-3">
            {movies.map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`} className="group min-w-0 flex-1">
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface transition-colors group-hover:border-ns-text/60">
                  {m.posterPath ? (
                    <Image
                      src={tmdbImageUrl(m.posterPath, 'w342')}
                      alt={m.title}
                      fill sizes="(max-width: 640px) 18vw, 160px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FilmIcon size={28} className="text-ns-muted/40" />
                    </div>
                  )}
                </div>
                {/* Rank + title */}
                <p className="mt-2 font-display text-xl leading-none text-ns-secondary-readable">{m.position}</p>
                <p className="mt-1 line-clamp-1 font-body text-[11px] text-ns-muted transition-colors group-hover:text-ns-text">
                  {m.title}
                </p>
                {m.releaseDate && (
                  <p className="hidden font-body text-[11px] text-ns-muted sm:block">{formatYear(m.releaseDate)}</p>
                )}
              </Link>
            ))}

            {/* Empty slot prompts */}
            {Array.from({ length: 5 - movies.length }).map((_, i) => (
              <div key={`empty-${i}`} className="min-w-0 flex-1">
                <button
                  onClick={() => setEditing(true)}
                  className="group flex aspect-[2/3] w-full cursor-pointer items-center justify-center rounded border border-dashed border-ns-border transition-colors hover:border-ns-text/60"
                >
                  <span className="text-xl text-ns-muted transition-colors group-hover:text-ns-text">+</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {movies.length > 0 && (
          <p className="mt-4 border-t border-ns-border pt-3 font-body text-xs text-ns-muted">
            Your Top 5 contributes <span className="text-ns-secondary-readable">35%</span> of your Movie DNA ·{' '}
            <button onClick={() => setEditing(true)} className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
              Edit order
            </button>
          </p>
        )}
      </Section>

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
