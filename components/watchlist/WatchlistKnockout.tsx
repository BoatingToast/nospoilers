'use client'





// CHUNK 1 — KNOCKOUT SETUP AND SHUFFLE





import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AchievementsIcon, CheckIcon, CloseIcon } from '@/components/icons'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import type { WatchlistItemData } from '@/types'

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









// CHUNK 2 — TOURNAMENT STATE AND WINNER LOGIC





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










// CHUNK 3 — MATCHUP MODAL AND CHAMPION REVEAL





  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-400/20 bg-gradient-to-r from-purple-500/10 to-transparent p-4 sm:p-5">
        <div>
          <p className="text-sm font-heading font-semibold text-ns-text">
            Watchlist Knockout
          </p>
          <p className="mt-1 text-xs font-body text-ns-muted">
            Select any movies—or your entire watchlist—then pick a champion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void openMovieSelector()}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-300/25 bg-purple-400 px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-all hover:-translate-y-0.5 hover:bg-purple-300"
        >
          <AchievementsIcon size={16} />
          Choose Movies
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Watchlist Knockout"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-ns-border bg-ns-surface p-5 shadow-2xl sm:p-8"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-ns-bg/85 text-ns-muted transition-colors hover:text-white"
              aria-label="Close Watchlist Knockout"
            >
              <CloseIcon size={17} />
            </button>

            {isSelecting ? (
              <div>
                <div className="pr-12">
                  <p className="text-[10px] font-body uppercase tracking-[0.2em] text-purple-300">
                    Build your bracket
                  </p>
                  <h2 className="mt-1 font-display text-3xl tracking-wider text-white sm:text-4xl">
                    SELECT MOVIES
                  </h2>
                  <p className="mt-2 text-xs font-body text-ns-muted sm:text-sm">
                    Choose at least two. Every selected movie stays in the knockout until it loses.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-ns-border py-3">
                  <p className="text-xs font-body text-ns-muted">
                    <span className="font-semibold text-white">{selectedIds.length}</span> of{' '}
                    {availableMovies.length} selected
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(availableMovies.map(movie => movie.tmdbId))}
                      disabled={isLoadingMovies || availableMovies.length === 0}
                      className="rounded-lg border border-purple-300/30 px-3 py-1.5 text-xs font-body font-semibold text-purple-300 transition-colors hover:bg-purple-400/10 disabled:opacity-40"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      disabled={isLoadingMovies || selectedIds.length === 0}
                      className="rounded-lg border border-ns-border px-3 py-1.5 text-xs font-body text-ns-muted transition-colors hover:text-white disabled:opacity-40"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {loadError && (
                  <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs font-body text-amber-300">
                    {loadError}
                  </p>
                )}

                {isLoadingMovies ? (
                  <div className="flex min-h-72 items-center justify-center">
                    <div className="text-center">
                      <AchievementsIcon size={32} className="mx-auto animate-pulse text-purple-300" />
                      <p className="mt-3 text-xs font-body text-ns-muted">Loading your full watchlist…</p>
                    </div>
                  </div>
                ) : availableMovies.length === 0 ? (
                  <div className="flex min-h-72 items-center justify-center text-center">
                    <div>
                      <p className="font-heading text-sm font-semibold text-white">Your watchlist is empty</p>
                      <p className="mt-1 text-xs font-body text-ns-muted">Add at least two movies to start a knockout.</p>
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
                          className={`flex items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                            isSelected
                              ? 'border-purple-300/50 bg-purple-400/10'
                              : 'border-ns-border bg-ns-bg/40 hover:border-ns-muted/50'
                          }`}
                        >
                          <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md bg-ns-bg">
                            <Image
                              src={tmdbImageUrl(movie.posterPath, 'w185')}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-body font-semibold text-white">{movie.title}</p>
                            <p className="mt-0.5 text-[10px] font-body text-ns-muted">{formatYear(movie.releaseDate)}</p>
                          </div>
                          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? 'border-purple-300 bg-purple-400 text-ns-bg'
                              : 'border-ns-border text-transparent'
                          }`}>
                            <CheckIcon size={14} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-4 border-t border-ns-border bg-ns-surface/95 py-4 backdrop-blur-sm">
                  <p className="text-[11px] font-body text-ns-muted">
                    {selectedIds.length < 2
                      ? 'Select at least two movies'
                      : `${selectedIds.length - 1} match${selectedIds.length === 2 ? '' : 'es'} to find a winner`}
                  </p>
                  <button
                    type="button"
                    onClick={startTournament}
                    disabled={selectedIds.length < 2 || isLoadingMovies}
                    className="rounded-xl bg-purple-400 px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Start with {selectedIds.length}
                  </button>
                </div>
              </div>
            ) : champion ? (
              <div className="mx-auto max-w-sm py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ns-secondary/30 bg-ns-secondary/10 text-ns-secondary-readable">
                  <AchievementsIcon size={27} />
                </div>
                <p className="mt-4 text-[10px] font-body uppercase tracking-[0.25em] text-ns-secondary-readable">
                  Tonight&apos;s champion
                </p>

                <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl border border-ns-secondary/30 bg-ns-bg shadow-xl">
                  <Image
                    src={tmdbImageUrl(champion.posterPath, 'w500')}
                    alt={champion.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="220px"
                  />
                </div>

                <h2 className="mt-4 font-display text-3xl tracking-wider text-white">
                  {champion.title.toUpperCase()}
                </h2>
                <p className="mt-1 text-xs font-body text-ns-muted">
                  {formatYear(champion.releaseDate)} · Winner of a {totalMatches + 1}-movie bracket
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={startTournament}
                    className="rounded-xl border border-ns-border px-2 py-2.5 text-xs font-body text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-white sm:px-4 sm:text-sm"
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSelecting(true)}
                    className="rounded-xl border border-purple-300/30 px-2 py-2.5 text-xs font-body text-purple-300 transition-colors hover:bg-purple-400/10 sm:px-4 sm:text-sm"
                  >
                    Change Movies
                  </button>
                  <Link
                    href={`/movie/${champion.tmdbId}`}
                    className="rounded-xl bg-ns-secondary px-2 py-2.5 text-xs font-body font-semibold text-ns-secondary-foreground transition-colors hover:bg-amber-300 hover:text-ns-bg sm:px-4 sm:text-sm"
                  >
                    View Movie
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 pr-12">
                  <p className="text-[10px] font-body uppercase tracking-[0.2em] text-purple-300">
                    Match {Math.min(completedMatches + 1, totalMatches)} of {totalMatches}
                  </p>
                  <h2 className="mt-1 font-display text-3xl tracking-wider text-white sm:text-4xl">
                    WHICH WOULD YOU RATHER WATCH?
                  </h2>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ns-bg">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-ns-secondary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="relative grid grid-cols-2 gap-3 sm:gap-8">
                  {matchup.map(movie => (
                    <button
                      key={movie.tmdbId}
                      type="button"
                      onClick={() => chooseMovie(movie)}
                      className="group min-w-0 rounded-2xl border border-ns-border bg-ns-bg/50 p-2 text-left transition-all hover:-translate-y-1 hover:border-purple-300/60 hover:shadow-[0_0_28px_rgba(192,132,252,0.14)] sm:p-4"
                      aria-label={`Choose ${movie.title}`}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-bg">
                        <Image
                          src={tmdbImageUrl(movie.posterPath, 'w500')}
                          alt={movie.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 45vw, 340px"
                        />
                        {movie.matchScore !== null && (
                          <span className="absolute right-2 top-2 rounded-full border border-ns-secondary/25 bg-ns-bg/85 px-2 py-1 text-[10px] font-body font-bold text-ns-secondary-readable backdrop-blur-sm">
                            {movie.matchScore}% match
                          </span>
                        )}
                      </div>

                      <p className="mt-3 truncate font-heading text-sm font-semibold text-white sm:text-lg">
                        {movie.title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-body text-ns-muted sm:text-xs">
                        {formatYear(movie.releaseDate)}
                      </p>
                      <span className="mt-3 block rounded-lg bg-purple-400/10 py-2 text-center text-[10px] font-body font-semibold uppercase tracking-wider text-purple-300 transition-colors group-hover:bg-purple-400 group-hover:text-ns-bg sm:text-xs">
                        Pick this movie
                      </span>
                    </button>
                  ))}

                  <div className="pointer-events-none absolute left-1/2 top-[38%] z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-ns-border bg-ns-surface font-display text-sm tracking-wider text-ns-secondary-readable shadow-lg sm:h-12 sm:w-12 sm:text-base">
                    VS
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
