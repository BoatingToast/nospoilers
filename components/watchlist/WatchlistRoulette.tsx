'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FilmIcon } from '@/components/icons'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'






// CHUNK 1 — ROULETTE SETUP AND RANDOM PICKER





interface Props {
  movies: WatchlistItemData[]
}

export default function WatchlistRoulette({ movies }: Props) {
  const [selectedMovie, setSelectedMovie] = useState<WatchlistItemData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  function pickMovie() {
    const unpicked = movies.filter(movie => movie.tmdbId !== selectedMovie?.tmdbId)
    const choices = unpicked.length > 0 ? unpicked : movies

    if (choices.length === 0) return

    setIsOpen(true)
    setIsPicking(true)
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const index = Math.floor(Math.random() * choices.length)
      setSelectedMovie(choices[index])
      setIsPicking(false)
    }, 700)
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  if (movies.length === 0) return null





  // CHUNK 2 — ROULETTE BUTTON AND POPUP





  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ns-secondary/25 bg-gradient-to-r from-ns-secondary/10 to-transparent p-4 sm:p-5">
        <div>
          <p className="text-sm font-heading font-semibold text-ns-text">
            Can&apos;t decide what to watch?
          </p>
          <p className="mt-1 text-xs font-body text-ns-muted">
            Let NoSpoilers choose from {movies.length} unwatched{' '}
            {movies.length === 1 ? 'movie' : 'movies'}.
          </p>
        </div>

        <button
          type="button"
          onClick={pickMovie}
          className="inline-flex items-center gap-2 rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-all hover:-translate-y-0.5 hover:bg-amber-300"
        >
          <FilmIcon size={16} />
          Pick for Me
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Watchlist Roulette result"
          onClick={() => !isPicking && setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-ns-border bg-ns-surface p-5 text-center shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPicking}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ns-bg/80 text-lg text-ns-muted transition-colors hover:text-white disabled:opacity-0"
              aria-label="Close roulette"
            >
              ×
            </button>

            {isPicking || !selectedMovie ? (
              <div className="flex min-h-[30rem] flex-col items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ns-secondary/30 bg-ns-secondary/10">
                  <FilmIcon size={34} className="animate-spin text-ns-secondary" />
                </div>
                <p className="mt-6 font-display text-2xl tracking-wider text-ns-text">
                  SHUFFLING…
                </p>
                <p className="mt-2 text-xs font-body text-ns-muted">
                  Searching your watchlist
                </p>
              </div>
            ) : (





              // CHUNK 3 — SELECTED MOVIE RESULT





              <div className="animate-[fadeIn_250ms_ease-out]">
                <p className="mb-3 text-[10px] font-body uppercase tracking-[0.25em] text-ns-secondary">
                  Tonight&apos;s pick
                </p>

                <div className="relative mx-auto aspect-[2/3] w-full max-w-[230px] overflow-hidden rounded-2xl border border-ns-border bg-ns-bg shadow-xl">
                  <Image
                    src={tmdbImageUrl(selectedMovie.posterPath, 'w500')}
                    alt={selectedMovie.title}
                    fill
                    className="object-cover"
                    sizes="230px"
                    priority
                  />
                </div>

                <h2 className="mt-4 font-display text-3xl tracking-wider text-ns-text">
                  {selectedMovie.title.toUpperCase()}
                </h2>
                <p className="mt-1 text-xs font-body text-ns-muted">
                  {formatYear(selectedMovie.releaseDate)}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={pickMovie}
                    className="rounded-xl border border-ns-border px-4 py-2.5 text-sm font-body text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-ns-text"
                  >
                    Reroll
                  </button>
                  <Link
                    href={`/movie/${selectedMovie.tmdbId}`}
                    className="rounded-xl bg-ns-secondary px-4 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-amber-300"
                  >
                    View Movie
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
