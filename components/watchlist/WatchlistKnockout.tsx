'use client'

import { useState } from 'react'
import PosterFill from '@/components/watchlist/PosterFill'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { CheckIcon } from '@/components/icons'
import { cn, formatYear } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'
import { Meter, posterZoomClass } from './LibraryControls'

interface Props {
  movies: WatchlistItemData[]
}

function shuffleMovies(movies: WatchlistItemData[]) {
  const shuffled = [...movies]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

export default function WatchlistKnockout({ movies }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isLoadingMovies, setIsLoadingMovies] = useState(false)
  const [availableMovies, setAvailableMovies] = useState<WatchlistItemData[]>(movies)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [round, setRound] = useState<WatchlistItemData[]>([])
  const [winners, setWinners] = useState<WatchlistItemData[]>([])
  const [champion, setChampion] = useState<WatchlistItemData | null>(null)
  const [completedMatches, setCompletedMatches] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const [loadError, setLoadError] = useState('')

  const matchup = round.slice(0, 2)
  const progress = totalMatches > 0
    ? Math.round((completedMatches / totalMatches) * 100)
    : 0

  async function openMovieSelector() {
    setIsOpen(true)
    setIsSelecting(true)
    setChampion(null)
    setLoadError('')
    setIsLoadingMovies(true)

    try {
      const response = await fetch('/api/watchlist?sortBy=title&stats=false', { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load the complete watchlist')

      const data = await response.json()
      const allMovies = Array.isArray(data.items) ? data.items as WatchlistItemData[] : []

      setAvailableMovies(allMovies)
      setSelectedIds(allMovies.map(movie => movie.tmdbId))
    } catch {
      setAvailableMovies(movies)
      setSelectedIds(movies.map(movie => movie.tmdbId))
      setLoadError('Could not refresh the full watchlist. Showing the movies already loaded.')
    } finally {
      setIsLoadingMovies(false)
    }
  }

  function toggleMovie(tmdbId: number) {
    setSelectedIds(current => current.includes(tmdbId)
      ? current.filter(id => id !== tmdbId)
      : [...current, tmdbId])
  }

  function startTournament() {
    const selectedMovies = availableMovies.filter(movie => selectedIds.includes(movie.tmdbId))
    if (selectedMovies.length < 2) return

    const contenders = shuffleMovies(selectedMovies)

    setRound(contenders)
    setWinners([])
    setChampion(null)
    setCompletedMatches(0)
    setTotalMatches(contenders.length - 1)
    setIsSelecting(false)
    setIsOpen(true)
  }

  function chooseMovie(winner: WatchlistItemData) {
    const remainingMatchups = round.slice(2)
    const advancingMovies = [...winners, winner]
    const nextCompletedMatches = completedMatches + 1

    setCompletedMatches(nextCompletedMatches)

    if (remainingMatchups.length >= 2) {
      setRound(remainingMatchups)
      setWinners(advancingMovies)
      return
    }

    const nextRound = [...advancingMovies, ...remainingMatchups]

    if (nextRound.length === 1) {
      setChampion(nextRound[0])
      setRound([])
      setWinners([])
      return
    }

    setRound(nextRound)
    setWinners([])
  }

  return (
    <>
      <Button variant="outline" onClick={() => void openMovieSelector()}>Choose movies</Button>

      {isOpen && (
        <Modal
          onClose={() => setIsOpen(false)}
          ariaLabel="Watchlist Knockout"
          maxWidth="max-w-4xl"
          className="p-5 sm:p-8"
        >
          {isSelecting ? (
            <div>
              <div className="pr-12">
                <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Select movies</h2>
                <p className="mt-2 text-base text-ns-muted">
                  Choose at least two. Every selected movie stays in the knockout until it loses.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm tabular-nums text-ns-muted">
                  <span className="font-semibold text-ns-text">{selectedIds.length}</span> of{' '}
                  {availableMovies.length} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedIds(availableMovies.map(movie => movie.tmdbId))}
                    disabled={isLoadingMovies || availableMovies.length === 0}
                    className="hover:bg-ns-surface-2"
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    disabled={isLoadingMovies || selectedIds.length === 0}
                    className="hover:bg-ns-surface-2"
                  >
                    Clear all
                  </Button>
                </div>
              </div>

              {loadError && (
                <p role="alert" className="mt-4 rounded-xl bg-ns-warning/10 px-4 py-3 text-sm text-ns-warning">
                  {loadError}
                </p>
              )}

              {isLoadingMovies ? (
                <div role="status" aria-label="Loading your full watchlist" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <Skeleton key={index} className="h-[4.75rem] rounded-xl bg-ns-surface-2" />
                  ))}
                </div>
              ) : availableMovies.length === 0 ? (
                <div className="flex min-h-72 items-center justify-center text-center">
                  <div>
                    <p className="font-heading text-xl font-bold text-ns-text">Your watchlist is empty</p>
                    <p className="mt-1 text-base text-ns-muted">Add at least two movies to start a knockout.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableMovies.map(movie => {
                    const isSelected = selectedIds.includes(movie.tmdbId)

                    return (
                      <button
                        key={movie.tmdbId}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => toggleMovie(movie.tmdbId)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl p-2 text-left transition-colors duration-150',
                          isSelected ? 'bg-ns-surface-3' : 'bg-ns-surface-2 hover:bg-ns-surface-3',
                        )}
                      >
                        <div className="relative aspect-[2/3] w-10 flex-shrink-0 overflow-hidden rounded-lg bg-ns-bg">
                          <PosterFill
                            path={movie.posterPath}
                            size="w185"
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ns-text">{movie.title}</p>
                          <p className="mt-0.5 text-sm tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
                        </div>
                        <span className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                          isSelected ? 'bg-ns-accent text-ns-secondary-foreground' : 'border border-ns-border-strong text-transparent',
                        )}>
                          <CheckIcon size={14} strokeWidth={3} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="sticky -bottom-5 -mx-5 -mb-5 mt-5 flex items-center justify-between gap-4 border-t border-ns-border bg-ns-surface px-5 py-4 sm:-bottom-8 sm:-mx-8 sm:-mb-8 sm:px-8">
                <p className="text-sm tabular-nums text-ns-muted">
                  {selectedIds.length < 2
                    ? 'Select at least two movies'
                    : `${selectedIds.length - 1} match${selectedIds.length === 2 ? '' : 'es'} to find a winner`}
                </p>
                <Button
                  onClick={startTournament}
                  disabled={selectedIds.length < 2 || isLoadingMovies}
                  className="flex-shrink-0"
                >
                  Start with {selectedIds.length}
                </Button>
              </div>
            </div>
          ) : champion ? (
            <div className="mx-auto max-w-sm animate-fade-up py-4 text-center">
              <p className="text-sm font-semibold text-ns-secondary-readable">Tonight&apos;s champion</p>

              <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-xl bg-ns-bg shadow-2xl">
                <PosterFill
                  path={champion.posterPath}
                  size="w500"
                  alt={champion.title}
                  priority
                  className="object-cover"
                  sizes="220px"
                />
              </div>

              <h2 className="mt-5 break-words font-display text-3xl text-ns-text">{champion.title}</h2>
              <p className="mt-1 text-sm tabular-nums text-ns-muted">
                {formatYear(champion.releaseDate)} · Winner of a {totalMatches + 1}-movie bracket
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button href={`/movie/${champion.tmdbId}`}>View movie</Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={startTournament}>Replay</Button>
                  <Button variant="outline" onClick={() => setIsSelecting(true)}>Change movies</Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 pr-12">
                <p className="text-sm font-semibold tabular-nums text-ns-muted">
                  Match {Math.min(completedMatches + 1, totalMatches)} of {totalMatches}
                </p>
                <h2 className="mt-1 font-display text-3xl text-ns-text sm:text-4xl">Which would you rather watch?</h2>
                <Meter value={progress / 100} className="mt-4" />
              </div>

              <div key={matchup.map(movie => movie.tmdbId).join('-')} className="relative mx-auto grid max-w-2xl animate-fade-up grid-cols-2 gap-3 sm:gap-6">
                {matchup.map(movie => (
                  <button
                    key={movie.tmdbId}
                    type="button"
                    onClick={() => chooseMovie(movie)}
                    className="group min-w-0 rounded-2xl bg-ns-surface-2 p-2 text-left transition-colors duration-150 hover:bg-ns-surface-3 sm:p-3"
                    aria-label={`Choose ${movie.title}`}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-bg">
                      <PosterFill
                        path={movie.posterPath}
                        size="w500"
                        className={posterZoomClass}
                        sizes="(max-width: 640px) 45vw, 340px"
                      />
                      {movie.matchScore !== null && (
                        <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                          {movie.matchScore}% match
                        </span>
                      )}
                    </div>

                    <p className="mt-3 truncate font-heading text-base font-semibold text-ns-text sm:text-lg">
                      {movie.title}
                    </p>
                    <p className="mt-0.5 text-sm tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
                    <span className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-ns-bg text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:bg-ns-secondary group-hover:text-ns-secondary-foreground">
                      Pick this movie
                    </span>
                  </button>
                ))}

                <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-ns-text font-heading text-sm font-bold text-ns-bg shadow-2xl sm:h-12 sm:w-12">
                  vs
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
