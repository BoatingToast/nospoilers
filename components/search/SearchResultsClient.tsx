'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import PosterTile from '@/components/discover/PosterTile'
import { PersonIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
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
      <EmptyState
        title="Find your next film"
        description="Search for a movie, actor, or director to get started."
      />
    )
  }

  if (status === 'loading') return <SearchLoading query={query} />

  if (status === 'error') {
    return (
      <div role="alert">
        <EmptyState
          title="We couldn't complete that search."
          description={error}
          action={<Button onClick={() => setRetryKey(value => value + 1)}>Try again</Button>}
        />
      </div>
    )
  }

  const hasMovies = results.movies.length > 0
  const hasPeople = results.people.length > 0

  if (!hasMovies && !hasPeople) {
    return (
      <div aria-live="polite">
        <EmptyState
          title={`No results for “${query}”`}
          description="Check the spelling or try another title or name."
        />
      </div>
    )
  }

  const total = results.movies.length + results.people.length

  return (
    <div aria-live="polite" className="animate-fade-up">
      <div className="mb-8">
        <p className="text-base text-ns-muted">Results for</p>
        <h2 className="mt-1 break-words font-display text-4xl text-ns-text sm:text-5xl">
          &ldquo;{query}&rdquo;
        </h2>
        <p className="mt-2 text-base tabular-nums text-ns-muted">
          Showing {total.toLocaleString()} match{total === 1 ? '' : 'es'}
        </p>
      </div>

      {hasMovies && (
        <section aria-labelledby="movie-search-results">
          <h3 id="movie-search-results" className="mb-5 flex items-baseline gap-2.5 font-display text-2xl text-ns-text sm:text-3xl">
            Movies
            <span className="font-body text-base font-medium tabular-nums text-ns-muted">{results.movies.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.movies.map((movie, index) => (
              <div
                key={movie.id}
                className={index >= 6 ? 'ns-reveal min-w-0' : 'min-w-0'}
                style={index >= 6 ? { '--i': index % 6 } as React.CSSProperties : undefined}
              >
                <PosterTile
                  href={`/movie/${movie.id}`}
                  title={movie.title}
                  posterPath={movie.poster_path}
                  meta={formatYear(movie.release_date)}
                  rating={movie.vote_average}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {hasPeople && (
        <section aria-labelledby="people-search-results" className={hasMovies ? 'ns-reveal mt-12 lg:mt-16' : ''}>
          <h3 id="people-search-results" className="mb-5 flex items-baseline gap-2.5 font-display text-2xl text-ns-text sm:text-3xl">
            People
            <span className="font-body text-base font-medium tabular-nums text-ns-muted">{results.people.length}</span>
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.people.map(person => (
              <Card
                key={person.id}
                href={`/actor/${person.id}`}
                interactive
                className="group flex min-h-20 min-w-0 items-center gap-4 p-3"
              >
                <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ns-surface-2">
                  {person.profile_path ? (
                    <Image
                      src={tmdbImageUrl(person.profile_path, 'w185')}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <PersonIcon size={24} className="text-ns-muted" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-heading text-base font-semibold text-ns-text">{person.name}</span>
                  <span className="mt-0.5 block truncate text-sm text-ns-muted">{person.known_for_department || 'Film and television'}</span>
                </span>
              </Card>
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
      <div className="mb-8 space-y-2" aria-hidden="true">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[2/3] rounded-xl" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
            <Skeleton className="mt-1.5 h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
