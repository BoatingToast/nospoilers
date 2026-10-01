'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
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

    if (choices.length ===   0) return

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ns-border py-4">
        <div className="min-w-0">
          <p className="text-sm font-heading font-semibold text-ns-text">
            Can&apos;t decide what to watch?
          </p>
          <p className="mt-1 text-xs font-body text-ns-muted">
            Let NoSpoilers choose from {movies.length} unwatched{' '}
            {movies.length === 1 ? 'movie' : 'movies'}.
          </p>
        </div>

        <Button variant="secondary" onClick={pickMovie}>
          <FilmIcon size={16} />
          Pick for Me
        </Button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Watchlist Roulette result"
          onClick={() => !isPicking && setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded border border-ns-text/70 bg-ns-surface p-5"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPicking}
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center text-lg text-ns-muted transition-colors hover:text-white disabled:opacity-0"
              aria-label="Close roulette"
            >
              ×
            </button>

            {isPicking || !selectedMovie ? (
              <div className="flex min-h-[30rem] flex-col justify-end">
                <FilmIcon size={34} className="animate-spin text-ns-secondary-readable" />
                <p className="mt-6 font-display text-2xl tracking-wider text-ns-text">
                  SHUFFLING…
                </p>
                <p className="mt-2 text-xs font-body text-ns-muted">
                  Searching your watchlist
                </p>
              </div>
            ) : (





              // CHUNK 3 — SELECTED MOVIE RESULT





              <div>
                <div className="relative aspect-[2/3] w-full max-w-[230px] overflow-hidden rounded border border-ns-border bg-ns-bg">
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
                <p className="mt-1 text-sm font-body text-ns-muted">
                  Tonight&apos;s pick · {formatYear(selectedMovie.releaseDate)}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={pickMovie}>
                    Reroll
                  </Button>
                  <Button variant="primary" href={`/movie/${selectedMovie.tmdbId}`}>
                    View Movie
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
