'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
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

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="FAVORITE FILMS"
        lede={<>Search for and select {MIN}–{MAX} movies you love. These shape your entire Movie DNA.</>}
      />

      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0">
      <div className="mb-8 border-b border-ns-border pb-4">
        <button
          type="button"
          aria-expanded={showImport}
          onClick={() => setShowImport(value => !value)}
          className="group flex min-h-10 w-full items-start justify-between gap-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-body font-semibold text-ns-secondary-readable underline underline-offset-4 group-hover:text-ns-text">Already use Letterboxd or IMDb?</span>
            <span className="mt-1 block text-xs font-body text-ns-muted">Import your history and we&apos;ll suggest favorites from your highest ratings.</span>
          </span>
          <span aria-hidden="true" className="font-body text-sm text-ns-muted">{showImport ? '↑' : '↓'}</span>
        </button>
        {showImport && (
          <div className="mt-5">
            <TasteImport
              compact
              onImported={favorites => {
                setSelected(favorites.slice(0, MAX))
              }}
            />
          </div>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-8">
        <div className="flex items-center gap-3 bg-ns-surface border border-ns-border rounded px-4 py-3
                        focus-within:border-ns-secondary/40 transition-colors">
          {searching ? (
            <svg className="animate-spin w-4 h-4 text-ns-muted flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-ns-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search for a movie..."
            disabled={selected.length >= MAX}
            className="min-w-0 flex-1 bg-transparent text-ns-text placeholder:text-ns-muted/40 text-sm font-body focus:outline-none"
          />
          <span className={`text-xs font-body flex-shrink-0 ${selected.length >= MIN ? 'text-ns-secondary-readable' : 'text-ns-muted/50'}`}>
            {selected.length}/{MAX}
          </span>
        </div>

        {/* Search error */}
        {searchErr && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-ns-surface border border-red-500/30
                          rounded px-4 py-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <p className="text-red-400 text-xs font-body leading-relaxed">{searchErr}</p>
          </div>
        )}

        {/* Dropdown results */}
        {open && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-ns-surface border border-ns-text/70
                       rounded overflow-hidden divide-y divide-ns-border"
          >
            {results.map(movie => {
              const isSelected = !!selected.find(m => m.tmdbId === movie.id)
              const isDisabled = !isSelected && selected.length >= MAX
              return (
                <button
                  key={movie.id}
                  onClick={() => toggleMovie(movie)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                              ${isDisabled ? 'opacity-40 cursor-not-allowed' :
                                isSelected ? 'bg-ns-secondary/10' :
                                             'hover:bg-ns-surface-2'}`}
                >
                  <div className="w-8 h-12 rounded flex-shrink-0 overflow-hidden bg-ns-border">
                    <Image
                      src={tmdbImageUrl(movie.poster_path, 'w185')}
                      alt={movie.title}
                      width={32} height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ns-text text-sm font-body font-medium truncate">{movie.title}</p>
                    <p className="text-ns-muted text-xs font-body">{formatYear(movie.release_date)}</p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-ns-secondary-readable flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected grid */}
      {selected.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {selected.map(movie => (
            <div key={movie.tmdbId} className="relative group">
              <div className="aspect-[2/3] rounded overflow-hidden bg-ns-surface border border-ns-border">
                <Image
                  src={tmdbImageUrl(movie.posterPath, 'w185')}
                  alt={movie.title}
                  width={100} height={150}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setSelected(selected.filter(m => m.tmdbId !== movie.tmdbId))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full
                           flex items-center justify-center opacity-0 group-hover:opacity-100
                           transition-opacity"
              >
                <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
              <p className="text-ns-muted text-[11px] font-body mt-1 text-center truncate leading-tight">
                {movie.title}
              </p>
            </div>
          ))}
          {/* Empty slots */}
          {selected.length < MIN && Array.from({ length: MIN - selected.length }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-[2/3] rounded border border-dashed border-ns-border flex items-center justify-center">
              <span className="text-ns-muted text-lg">+</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-t border-ns-border py-4 text-ns-muted text-sm font-body">
          Search above and select at least {MIN} films you love
        </p>
      )}
      </div>

      {/* Status + CTA */}
      <div className="min-w-0 border-t-2 border-ns-text pt-4 lg:sticky lg:top-6 lg:self-start">
        <p className="mb-4 text-ns-muted text-sm font-body">
          {selected.length < MIN
            ? `${MIN - selected.length} more to go`
            : `${selected.length} selected — looking great`}
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          loading={loading}
        >
          Continue →
        </Button>
      </div>
      </div>
    </div>
  )
}
