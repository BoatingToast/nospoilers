import { searchMovies } from '@/services/tmdb'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import SearchBar from '@/components/landing/SearchBar'
import type { Metadata } from 'next'
import { SearchIcon, FilmIcon, StarIcon } from '@/components/icons'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return { title: q ? `"${q}" — NoSpoilers Search` : 'Search — NoSpoilers' }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let results: Awaited<ReturnType<typeof searchMovies>> | null = null
  let error: string | null = null

  if (query) {
    try {
      results = await searchMovies(query)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Search failed.'
    }
  }

  const movies = results?.results ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Search bar pre-filled with query */}
      <div className="mb-10">
        <SearchBar initialValue={query} />
      </div>

      {/* Heading */}
      {query && (
        <div className="mb-6">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-1">Results for</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text">
            &ldquo;{query}&rdquo;
          </h1>
          {movies.length > 0 && (
            <p className="text-ns-muted text-sm font-body mt-1">
              {results?.total_results?.toLocaleString()} result{results?.total_results !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-ns-surface border border-red-500/20 rounded-2xl p-4 mb-6">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <p className="text-red-400 text-sm font-body">{error}</p>
        </div>
      )}

      {/* No query */}
      {!query && !error && (
        <div className="text-center py-20">
          <SearchIcon size={52} className="text-ns-gold/40 mx-auto mb-4" />
          <p className="text-ns-muted font-body text-sm">Type a movie title above and press Search.</p>
        </div>
      )}

      {/* No results */}
      {query && !error && movies.length === 0 && (
        <div className="text-center py-20">
          <FilmIcon size={44} className="text-ns-gold/40 mx-auto mb-4" />
          <p className="text-ns-muted font-body text-sm">
            No results for &ldquo;{query}&rdquo;. Try a different title.
          </p>
        </div>
      )}

      {/* Results grid */}
      {movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map(movie => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="group">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border relative">
                <Image
                  src={tmdbImageUrl(movie.poster_path, 'w342')}
                  alt={movie.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                />
                {movie.vote_average > 0 && (
                  <div className="absolute top-2 right-2 bg-ns-bg/80 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <span className="text-ns-gold text-[10px] font-body font-bold">
                      <StarIcon size={9} className="inline-block mr-0.5" />{movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-ns-text text-xs font-body font-medium mt-2 truncate group-hover:text-ns-gold transition-colors">
                {movie.title}
              </p>
              <p className="text-ns-muted/60 text-[11px] font-body">{formatYear(movie.release_date)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
