'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PersonIcon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
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
      <div className="border-t-2 border-ns-text pt-4">
        <p className="text-sm font-body text-ns-muted">Search for a movie, actor, or director to get started.</p>
      </div>
    )
  }

  if (status === 'loading') return <SearchLoading query={query} />

  if (status === 'error') {
    return (
      <div className="border-t-2 border-ns-text pt-4" role="alert">
        <p className="font-heading font-semibold text-ns-text">We couldn&apos;t complete that search.</p>
        <p className="mt-2 text-sm font-body text-red-400">{error}</p>
        <Button
          variant="secondary"
          onClick={() => setRetryKey(value => value + 1)}
          className="mt-5 min-h-11"
        >
          Try again
        </Button>
      </div>
    )
  }

  const hasMovies = results.movies.length > 0
  const hasPeople = results.people.length > 0

  if (!hasMovies && !hasPeople) {
    return (
      <div className="border-t-2 border-ns-text pt-4" aria-live="polite">
        <p className="font-heading font-semibold text-ns-text">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-1 text-sm font-body text-ns-muted">Check the spelling or try another title or name.</p>
      </div>
    )
  }

  const both = hasMovies && hasPeople
  const matchCount = results.movies.length + results.people.length

  return (
    <div aria-live="polite">
      <div className="mb-8">
        <h2 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">
          &ldquo;{query}&rdquo;
        </h2>
        <p className="mt-2 text-sm font-body text-ns-muted">
          Showing {matchCount.toLocaleString()} match{matchCount === 1 ? '' : 'es'}
        </p>
      </div>

      <div className={both ? 'grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10' : undefined}>
        {hasMovies && (
          <section aria-labelledby="movie-search-results" className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h3 id="movie-search-results" className="font-display text-2xl leading-none tracking-wide text-ns-text sm:text-3xl">MOVIES</h3>
              <span className="text-xs font-body text-ns-muted">{results.movies.length}</span>
            </div>
            <div className={both
              ? 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'}
            >
              {results.movies.map(movie => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  aria-label={`View ${movie.title}`}
                  className="group min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
                >
                  <Card interactive className="relative aspect-[2/3] overflow-hidden group-hover:border-ns-text/60">
                    <Image
                      src={tmdbImageUrl(movie.poster_path, 'w342')}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                    />
                    {movie.vote_average > 0 && (
                      <Badge variant="secondary" className="absolute right-2 top-2 bg-ns-bg/90">
                        {movie.vote_average.toFixed(1)}
                      </Badge>
                    )}
                  </Card>
                  <p className="mt-2 truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                    {movie.title}
                  </p>
                  <p className="mt-0.5 text-xs font-body text-ns-muted">{formatYear(movie.release_date)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {hasPeople && (
          <section aria-labelledby="people-search-results" className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h3 id="people-search-results" className="font-display text-2xl leading-none tracking-wide text-ns-text sm:text-3xl">PEOPLE</h3>
              <span className="text-xs font-body text-ns-muted">{results.people.length}</span>
            </div>
            <div className={both ? undefined : 'grid gap-x-10 sm:grid-cols-2'}>
              {results.people.map(person => (
                <Link
                  key={person.id}
                  href={`/actor/${person.id}`}
                  className="group flex min-h-16 min-w-0 items-center gap-4 border-t border-ns-border py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
                >
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ns-surface-2">
                    {person.profile_path ? (
                      <Image
                        src={tmdbImageUrl(person.profile_path, 'w185')}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <PersonIcon size={22} className="text-ns-muted/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">{person.name}</p>
                    <p className="mt-0.5 text-xs font-body text-ns-muted">{person.known_for_department || 'Film and television'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function SearchLoading({ query }: { query: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Searching for {query}</span>
      <div className="mb-8 animate-pulse" aria-hidden="true">
        <div className="h-9 w-52 max-w-full rounded bg-ns-border" />
        <div className="mt-2 h-3 w-32 rounded bg-ns-border" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t-2 border-ns-text pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[2/3] rounded bg-ns-border" />
            <div className="mt-2 h-3 w-3/4 rounded bg-ns-border" />
            <div className="mt-1 h-2.5 w-1/3 rounded bg-ns-border" />
          </div>
        ))}
      </div>
    </div>
  )
}
