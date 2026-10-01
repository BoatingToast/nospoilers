'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PersonIcon } from '@/components/icons'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { SearchApiResponse, TMDbMovie, TMDbPerson } from '@/types'

export default function SearchModal() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [movies,  setMovies]  = useState<TMDbMovie[]>([])
  const [people,  setPeople]  = useState<TMDbPerson[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timer    = useRef<ReturnType<typeof setTimeout>>()
  const request  = useRef<AbortController | null>(null)
  const requestId = useRef(0)

  const search = useCallback((q: string) => {
    clearTimeout(timer.current)
    request.current?.abort()
    const normalizedQuery = q.trim()
    const currentRequest = ++requestId.current

    if (!normalizedQuery) {
      setMovies([])
      setPeople([])
      setError('')
      setLoading(false)
      return
    }

    setError('')
    setLoading(true)
    timer.current = setTimeout(async () => {
      const controller = new AbortController()
      request.current = controller

      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        })
        const data = await res.json() as Partial<SearchApiResponse> & { error?: string }
        if (!res.ok) throw new Error(data.error || 'Search failed. Please try again.')
        if (currentRequest !== requestId.current) return
        setMovies(data.movies ?? [])
        setPeople(data.people ?? [])
      } catch (reason) {
        if (controller.signal.aborted || (reason instanceof DOMException && reason.name === 'AbortError')) return
        if (currentRequest !== requestId.current) return
        setMovies([])
        setPeople([])
        setError(reason instanceof Error ? reason.message : 'Search failed. Please try again.')
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => { search(query) }, [query, search])

  useEffect(() => () => {
    clearTimeout(timer.current)
    request.current?.abort()
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() { setOpen(false); setQuery('') }
  const hasResults = movies.length > 0 || people.length > 0
  const normalizedQuery = query.trim()

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 bg-ns-surface border border-ns-border
                   rounded-xl text-ns-muted text-sm font-body hover:border-ns-muted/40 transition-colors
                   sm:w-auto sm:min-w-[200px]"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="min-w-0 truncate">Search movies and people...</span>
        <span className="ml-auto hidden rounded bg-ns-border px-1.5 py-0.5 text-[10px] text-ns-muted/60 min-[360px]:block">⌘K</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-ns-bg/80 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-xl bg-ns-surface border border-ns-border rounded-2xl
                       shadow-2xl shadow-black/80 overflow-hidden"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
          >
            <h2 id="global-search-title" className="sr-only">Search movies and people</h2>
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-ns-border">
              {loading ? (
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
                aria-label="Search movies and people"
                placeholder="Search movies, actors, directors..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-ns-text placeholder:text-ns-muted/50 text-sm font-body focus:outline-none"
              />
              <button type="button" onClick={handleClose} aria-label="Close search" className="text-ns-muted hover:text-ns-text text-xs font-body">
                ESC
              </button>
            </div>

            {loading && <p className="sr-only" role="status">Searching for {query.trim()}</p>}

            {/* Results */}
            {hasResults && !loading && !error && (
              <div className="max-h-[60vh] overflow-y-auto">
                {movies.length > 0 && (
                  <div className="p-2">
                    <h3 className="text-ns-muted/60 text-[10px] tracking-widest uppercase font-body px-2 py-1.5">Movies</h3>
                    {movies.map(movie => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        onClick={handleClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ns-surface-2 transition-colors"
                      >
                        <div className="w-8 h-12 rounded overflow-hidden bg-ns-border flex-shrink-0">
                          <Image
                            src={tmdbImageUrl(movie.poster_path, 'w185')}
                            alt=""
                            width={32} height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-ns-text text-sm font-body font-medium truncate">{movie.title}</p>
                          <p className="text-ns-muted text-xs font-body">{formatYear(movie.release_date)}</p>
                        </div>
                        {movie.vote_average > 0 && (
                          <span className="ml-auto text-ns-secondary-readable text-xs font-body flex-shrink-0">
                            {movie.vote_average.toFixed(1)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {people.length > 0 && (
                  <div className="p-2 border-t border-ns-border">
                    <h3 className="text-ns-muted/60 text-[10px] tracking-widest uppercase font-body px-2 py-1.5">People</h3>
                    {people.map(person => (
                      <Link
                        key={person.id}
                        href={`/actor/${person.id}`}
                        onClick={handleClose}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ns-surface-2 transition-colors"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ns-border">
                          {person.profile_path ? (
                            <Image
                              src={tmdbImageUrl(person.profile_path, 'w185')}
                              alt=""
                              width={32} height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <PersonIcon size={15} className="text-ns-muted/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-ns-text text-sm font-body font-medium group-hover:text-ns-secondary-readable transition-colors">{person.name}</p>
                          <p className="text-ns-muted text-xs font-body">{person.known_for_department}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="p-6 text-center text-xs font-body text-ns-muted">
                Searching for &ldquo;{normalizedQuery}&rdquo;…
              </div>
            )}

            {error && !loading && (
              <div className="p-8 text-center" role="alert">
                <p className="text-sm font-body text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={() => search(query)}
                  className="mt-4 min-h-11 rounded-xl bg-ns-secondary px-4 py-2 text-xs font-body font-semibold text-ns-secondary-foreground"
                >
                  Try again
                </button>
              </div>
            )}

            {normalizedQuery && !loading && !error && !hasResults && (
              <div className="p-8 text-center text-ns-muted text-sm font-body">
                No results for &ldquo;{normalizedQuery}&rdquo;
              </div>
            )}

            {!normalizedQuery && !error && (
              <div className="p-6 text-center text-ns-muted/50 text-xs font-body">
                Search for any movie, actor, or director
              </div>
            )}

            {hasResults && !loading && !error && (
              <div className="border-t border-ns-border p-2">
                <Link
                  href={`/search?q=${encodeURIComponent(normalizedQuery)}`}
                  onClick={handleClose}
                  className="flex min-h-11 items-center justify-center rounded-xl text-xs font-body font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-secondary/10"
                >
                  View all results for &ldquo;{normalizedQuery}&rdquo;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
