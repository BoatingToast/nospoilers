'use client'

import { useEffect, useRef, useState } from 'react'
import PosterFill from '@/components/watchlist/PosterFill'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { cn, formatYear } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'

interface Props {
  movies: WatchlistItemData[]
}

const REEL_LEAD_IN = 7

export default function WatchlistRoulette({ movies }: Props) {
  const [selectedMovie, setSelectedMovie] = useState<WatchlistItemData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [reel, setReel] = useState<WatchlistItemData[]>([])
  const [spinning, setSpinning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const frameRef = useRef<number>()

  function pickMovie() {
    const unpicked = movies.filter(movie => movie.tmdbId !== selectedMovie?.tmdbId)
    const choices = unpicked.length > 0 ? unpicked : movies

    if (choices.length === 0) return

    const winner = choices[Math.floor(Math.random() * choices.length)]

    // The reel is a strip of posters that always lands on the winner.
    const others = movies.filter(movie => movie.tmdbId !== winner.tmdbId)
    const start = others.length > 0 ? Math.floor(Math.random() * others.length) : 0
    const leadIn = Array.from({ length: REEL_LEAD_IN }, (_, index) =>
      others.length > 0 ? others[(start + index) % others.length] : winner)

    setReel([...leadIn, winner])
    setSpinning(false)
    setIsOpen(true)
    setIsPicking(true)
    clearTimeout(timerRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => setSpinning(true))
    })

    timerRef.current = setTimeout(() => {
      setSelectedMovie(winner)
      setIsPicking(false)
    }, 700)
  }

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  if (movies.length === 0) return null

  const reelOffset = reel.length > 0 ? ((reel.length - 1) / reel.length) * 100 : 0

  return (
    <>
      <Button onClick={pickMovie}>Pick for me</Button>

      {isOpen && (
        <Modal
          onClose={() => { if (!isPicking) setIsOpen(false) }}
          ariaLabel="Watchlist Roulette result"
          maxWidth="max-w-sm"
          showClose={!isPicking}
          className="p-6 text-center"
        >
          <div className="relative mx-auto aspect-[2/3] w-full max-w-[230px] overflow-hidden rounded-xl bg-ns-surface-2">
            <div
              aria-hidden="true"
              style={{ transform: `translateY(-${spinning ? reelOffset : 0}%)` }}
              className={cn(
                'absolute inset-x-0 top-0 flex flex-col',
                spinning && 'transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
              )}
            >
              {reel.map((movie, index) => (
                <div key={`${movie.tmdbId}-${index}`} className="relative aspect-[2/3] w-full flex-shrink-0">
                  <PosterFill
                    path={movie.posterPath}
                    size="w342"
                    className="object-cover"
                    sizes="230px"
                    priority={index === reel.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          <div role="status" className="mt-5 min-h-[10.5rem]">
            {isPicking || !selectedMovie ? (
              <>
                <p className="font-heading text-2xl font-bold text-ns-text">Shuffling…</p>
                <p className="mt-1 text-sm text-ns-muted">Searching your watchlist</p>
              </>
            ) : (
              <div className="animate-fade-up">
                <p className="text-sm font-semibold text-ns-secondary-readable">Tonight&apos;s pick</p>
                <h2 className="mt-1 break-words font-display text-3xl text-ns-text">{selectedMovie.title}</h2>
                <p className="mt-1 text-sm tabular-nums text-ns-muted">{formatYear(selectedMovie.releaseDate)}</p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={pickMovie}>Reroll</Button>
                  <Button href={`/movie/${selectedMovie.tmdbId}`}>View movie</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
