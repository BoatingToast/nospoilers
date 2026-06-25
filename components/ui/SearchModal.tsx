'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TMDbMovie, TMDbPerson } from '@/types'

export default function SearchModal() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [movies,  setMovies]  = useState<TMDbMovie[]>([])
  const [people,  setPeople]  = useState<TMDbPerson[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer    = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback((q: string) => {
    clearTimeout(timer.current)
    if (!q.trim()) { setMovies([]); setPeople([]); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setMovies(data.movies ?? [])
        setPeople(data.people ?? [])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => { search(query) }, [query, search])

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

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-2.5 bg-ns-surface border border-ns-border
                   rounded-xl text-ns-muted text-sm font-body hover:border-ns-muted/40 transition-colors
                   min-w-[200px]"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        Search movies...
        <span className="ml-auto text-[10px] bg-ns-border px-1.5 py-0.5 rounded text-ns-muted/60">⌘K</span>
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
          >
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
                placeholder="Search movies, actors, directors..."
                className="flex-1 bg-transparent text-ns-text placeholder:text-ns-muted/50 text-sm font-body focus:outline-none"
              />
              <button onClick={handleClose} className="text-ns-muted hover:text-ns-text text-xs font-body">
                ESC
              </button>
            </div>

            {/* Results */}
            {hasResults && (
              <div className="max-h-[60vh] overflow-y-auto">
                {movies.length > 0 && (
                  <div className="p-2">
                    <p className="text-ns-muted/60 text-[10px] tracking-widest uppercase font-body px-2 py-1.5">Movies</p>
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
                            alt={movie.title}
                            width={32} height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-ns-text text-sm font-body font-medium truncate">{movie.title}</p>
                          <p className="text-ns-muted text-xs font-body">{formatYear(movie.release_date)}</p>
                        </div>
                        {movie.vote_average > 0 && (
                          <span className="ml-auto text-ns-gold text-xs font-body flex-shrink-0">
                            {movie.vote_average.toFixed(1)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {people.length > 0 && (
                  <div className="p-2 border-t border-ns-border">
                    <p className="text-ns-muted/60 text-[10px] tracking-widest uppercase font-body px-2 py-1.5">People</p>
                    {people.map(person => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-ns-border flex-shrink-0">
                          <Image
                            src={tmdbImageUrl(person.profile_path, 'w185')}
                            alt={person.name}
                            width={32} height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-ns-text text-sm font-body font-medium">{person.name}</p>
                          <p className="text-ns-muted text-xs font-body">{person.known_for_department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {query && !loading && !hasResults && (
              <div className="p-8 text-center text-ns-muted text-sm font-body">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!query && (
              <div className="p-6 text-center text-ns-muted/50 text-xs font-body">
                Search for any movie, actor, or director
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
