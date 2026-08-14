'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FilmIcon, PersonIcon, SearchIcon, StarIcon } from '@/components/icons'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import type { SearchApiResponse } from '@/types'

type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

const EMPTY_RESULTS: SearchApiResponse = {
  query: '',
  movies: [],
  people: [],
  totalResults: 0,
}

export default function SearchResultsClient({ query }: { query: string }) {
  const [results, setResults] = useState<SearchApiResponse>(EMPTY_RESULTS)
  const [status, setStatus] = useState<SearchStatus>(query ? 'loading' : 'idle')
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!query) {
      setResults(EMPTY_RESULTS)
      setError('')
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setError('')

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json() as Partial<SearchApiResponse> & { error?: string }
        if (!response.ok) throw new Error(data.error || 'Search failed. Please try again.')
        return data as SearchApiResponse
      })
      .then(data => {
        setResults(data)
        setStatus('success')
      })
      .catch(reason => {
        if (controller.signal.aborted || (reason instanceof DOMException && reason.name === 'AbortError')) return
        setResults(EMPTY_RESULTS)
        setError(reason instanceof Error ? reason.message : 'Search failed. Please try again.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [query, retryKey])

  if (status === 'idle') {
    return (
      <div className="rounded-2xl border border-dashed border-ns-border py-16 text-center">
        <SearchIcon size={48} className="mx-auto mb-4 text-ns-secondary/40" />
        <p className="text-sm font-body text-ns-muted">Search for a movie, actor, or director to get started.</p>
      </div>
    )
  }

  if (status === 'loading') return <SearchLoading query={query} />

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-ns-surface p-8 text-center" role="alert">
        <p className="font-heading font-semibold text-ns-text">We couldn&apos;t complete that search.</p>
        <p className="mt-2 text-sm font-body text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => setRetryKey(value => value + 1)}
          className="mt-5 min-h-11 rounded-xl bg-ns-secondary px-5 py-2 text-sm font-body font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90"
        >
          Try again
        </button>
      </div>
    )
  }

  const hasMovies = results.movies.length > 0
  const hasPeople = results.people.length > 0

  if (!hasMovies && !hasPeople) {
    return (
      <div className="rounded-2xl border border-dashed border-ns-border py-16 text-center" aria-live="polite">
        <FilmIcon size={44} className="mx-auto mb-4 text-ns-secondary/40" />
        <p className="font-heading font-semibold text-ns-text">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-1 text-sm font-body text-ns-muted">Check the spelling or try another title or name.</p>
      </div>
    )
  }

  return (
    <div aria-live="polite">
      <div className="mb-7">
        <p className="text-xs font-body uppercase tracking-widest text-ns-muted">Results for</p>
        <h2 className="mt-1 font-display text-3xl tracking-wider text-ns-text sm:text-4xl">
          &ldquo;{query}&rdquo;
        </h2>
        <p className="mt-1 text-sm font-body text-ns-muted">
          Showing {(results.movies.length + results.people.length).toLocaleString()} match{results.movies.length + results.people.length === 1 ? '' : 'es'}
        </p>
      </div>

      {hasMovies && (
        <section aria-labelledby="movie-search-results">
          <div className="mb-4 flex items-center gap-2">
            <FilmIcon size={18} className="text-ns-secondary" />
            <h3 id="movie-search-results" className="font-display text-2xl tracking-wider text-ns-text">MOVIES</h3>
            <span className="text-xs font-body text-ns-muted">{results.movies.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.movies.map(movie => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                aria-label={`View ${movie.title}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-ns-border bg-ns-surface">
                  <Image
                    src={tmdbImageUrl(movie.poster_path, 'w342')}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                  />
                  {movie.vote_average > 0 && (
                    <div className="absolute right-2 top-2 rounded-full bg-ns-bg/80 px-2 py-0.5 backdrop-blur-sm">
                      <span className="text-[10px] font-body font-bold text-ns-secondary">
                        <StarIcon size={9} className="mr-0.5 inline-block" />{movie.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-body font-medium text-ns-text transition-colors group-hover:text-ns-secondary">
                  {movie.title}
                </p>
                <p className="text-[11px] font-body text-ns-muted/60">{formatYear(movie.release_date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasPeople && (
        <section aria-labelledby="people-search-results" className={hasMovies ? 'mt-12 border-t border-ns-border pt-10' : ''}>
          <div className="mb-4 flex items-center gap-2">
            <PersonIcon size={18} className="text-ns-secondary" />
            <h3 id="people-search-results" className="font-display text-2xl tracking-wider text-ns-text">PEOPLE</h3>
            <span className="text-xs font-body text-ns-muted">{results.people.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.people.map(person => (
              <Link
                key={person.id}
                href={`/actor/${person.id}`}
                className="group flex min-h-20 items-center gap-4 rounded-2xl border border-ns-border bg-ns-surface p-3 transition-colors hover:border-ns-secondary/30 hover:bg-ns-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
              >
                <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ns-surface-2">
                  {person.profile_path ? (
                    <Image
                      src={tmdbImageUrl(person.profile_path, 'w185')}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <PersonIcon size={24} className="text-ns-muted/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-body font-semibold text-ns-text transition-colors group-hover:text-ns-secondary">{person.name}</p>
                  <p className="mt-0.5 text-xs font-body text-ns-muted">{person.known_for_department || 'Film and television'}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SearchLoading({ query }: { query: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Searching for {query}</span>
      <div className="mb-7 space-y-2 animate-pulse" aria-hidden="true">
        <div className="h-3 w-20 rounded bg-ns-border" />
        <div className="h-9 w-52 max-w-full rounded bg-ns-border" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-ns-border" />
            <div className="mt-2 h-3 w-3/4 rounded bg-ns-border" />
            <div className="mt-1 h-2.5 w-1/3 rounded bg-ns-border" />
          </div>
        ))}
      </div>
    </div>
  )
}
