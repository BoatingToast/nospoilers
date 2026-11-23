'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import { CheckIcon, ChevronIcon, CloseIcon, PlusIcon, SearchIcon, WarningIcon } from '@/components/icons'
import StepActions from './StepActions'
import type { TMDbMovie } from '@/types'
import TasteImport from '@/components/settings/TasteImport'

export interface SelectedMovie {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  genreIds:    number[]
}

interface StepMoviesProps {
  selected:    SelectedMovie[]
  setSelected: (movies: SelectedMovie[]) => void
  onNext:      () => void
  loading:     boolean
}

const MIN = 5
const MAX = 10

export default function StepMovies({ selected, setSelected, onNext, loading }: StepMoviesProps) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<TMDbMovie[]>([])
  const [open,      setOpen]      = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()

  // Debounced search
  const search = useCallback((q: string) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); setSearchErr(null); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok || data.error) {
          setSearchErr(data.error ?? 'Search unavailable. Check your TMDb API key in .env.')
          setResults([])
          setOpen(false)
        } else {
          setSearchErr(null)
          setResults(data.results?.slice(0, 8) ?? [])
          setOpen(true)
        }
      } catch {
        setSearchErr('Network error — please check your connection.')
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  useEffect(() => { search(query) }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggleMovie(movie: TMDbMovie) {
    const already = selected.find(m => m.tmdbId === movie.id)
    if (already) {
      setSelected(selected.filter(m => m.tmdbId !== movie.id))
    } else {
      if (selected.length >= MAX) return
      setSelected([...selected, {
        tmdbId:      movie.id,
        title:       movie.title,
        posterPath:  movie.poster_path,
        releaseDate: movie.release_date,
        genreIds:    movie.genre_ids,
      }])
      setQuery('')
      setOpen(false)
    }
  }

  const canProceed = selected.length >= MIN
  const emptySlots = Math.max(0, MIN - selected.length)

  return (
    <div>
      <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Favorite films</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-ns-muted">
        Search for and select {MIN}–{MAX} movies you love. These shape your entire Movie DNA.
      </p>

      <div className="relative mt-8">
        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-ns-border-strong bg-ns-bg px-4 transition-colors duration-150 focus-within:border-ns-text">
          {searching ? (
            <svg aria-hidden="true" className="h-5 w-5 flex-shrink-0 animate-spin text-ns-muted" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <SearchIcon size={20} className="flex-shrink-0 text-ns-muted" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search for a movie..."
            aria-label="Search for a movie"
            disabled={selected.length >= MAX}
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-ns-text placeholder:text-ns-subtle focus:outline-none disabled:cursor-not-allowed"
          />
          <span className={`flex-shrink-0 text-sm font-semibold tabular-nums transition-colors duration-200 ${canProceed ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
            {selected.length}/{MAX}
          </span>
        </div>

        {searchErr && (
          <div role="alert" className="mt-2 flex items-start gap-2.5 rounded-xl bg-ns-danger/10 px-4 py-3 text-sm leading-relaxed text-ns-danger motion-safe:animate-fade-up">
            <WarningIcon size={16} className="mt-0.5 flex-shrink-0" />
            <p>{searchErr}</p>
          </div>
        )}

        {open && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-[26rem] origin-top overflow-y-auto rounded-2xl bg-ns-surface-2 p-2 shadow-2xl motion-safe:animate-[fadeUp_200ms_cubic-bezier(0.23,1,0.32,1)_backwards]"
          >
            {results.map(movie => {
              const isSelected = !!selected.find(m => m.tmdbId === movie.id)
              const isDisabled = !isSelected && selected.length >= MAX
              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => toggleMovie(movie)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-150 ${
                    isDisabled ? 'cursor-not-allowed opacity-50' : isSelected ? 'bg-ns-surface-3' : 'hover:bg-ns-surface-3'
                  }`}
                >
                  <span className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-3">
                    <Image
                      src={tmdbImageUrl(movie.poster_path, 'w185')}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-base font-semibold text-ns-text">{movie.title}</span>
                    <span className="block text-sm tabular-nums text-ns-muted">{formatYear(movie.release_date)}</span>
                  </span>
                  {isSelected && <CheckIcon size={18} className="mr-2 flex-shrink-0 text-ns-secondary-readable" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ul className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
        {selected.map(movie => (
          <li key={movie.tmdbId} className="min-w-0 motion-safe:animate-[fadeUp_320ms_cubic-bezier(0.23,1,0.32,1)_backwards]">
            <button
              type="button"
              onClick={() => setSelected(selected.filter(m => m.tmdbId !== movie.tmdbId))}
              aria-label={`Remove ${movie.title}`}
              className="group relative block aspect-[2/3] w-full overflow-hidden rounded-xl bg-ns-surface-2"
            >
              <Image
                src={tmdbImageUrl(movie.posterPath, 'w185')}
                alt=""
                fill
                sizes="(min-width: 640px) 130px, 18vw"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
              />
              <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white transition-colors duration-150 group-hover:bg-ns-danger group-hover:text-ns-bg sm:right-1.5 sm:top-1.5">
                <CloseIcon size={12} />
              </span>
            </button>
            <p className="mt-1.5 truncate text-xs text-ns-muted sm:text-sm">{movie.title}</p>
          </li>
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <li key={`empty-${index}`} aria-hidden="true">
            <div className={`flex aspect-[2/3] items-center justify-center rounded-xl transition-colors duration-300 ${index === 0 ? 'bg-ns-surface-2 text-ns-text' : 'bg-ns-surface text-ns-subtle'}`}>
              <PlusIcon size={18} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-ns-surface">
        <button
          type="button"
          onClick={() => setShowImport(value => !value)}
          aria-expanded={showImport}
          aria-controls="onboarding-import"
          className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition-colors duration-150 hover:bg-ns-surface-2"
        >
          <span className="min-w-0">
            <span className="block font-heading text-base font-semibold text-ns-text">Already use Letterboxd or IMDb?</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-ns-muted">Import your history and we&apos;ll suggest favorites from your highest ratings.</span>
          </span>
          <ChevronIcon
            size={20}
            direction="down"
            className={`flex-shrink-0 text-ns-muted transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${showImport ? 'rotate-180' : ''}`}
          />
        </button>
        {showImport && (
          <div id="onboarding-import" className="px-5 pb-5 motion-safe:animate-[fadeUp_260ms_cubic-bezier(0.23,1,0.32,1)_backwards]">
            <TasteImport
              compact
              onImported={favorites => {
                setSelected(favorites.slice(0, MAX))
              }}
            />
          </div>
        )}
      </div>

      <StepActions
        status={selected.length < MIN
          ? `${MIN - selected.length} more to go`
          : `${selected.length} selected — looking great`}
        nextLabel="Continue"
        onNext={onNext}
        nextDisabled={!canProceed}
        loading={loading}
      />
    </div>
  )
}
