import MovieCard from '@/components/ui/MovieCard'
import RefreshButton from '@/components/ui/RefreshButton'
import Section from '@/components/ui/Section'
import { getTrendingMovies } from '@/services/tmdb'
import type { TMDbMovie } from '@/types'

type FeaturedMoviesResult =
  | { status: 'success'; movies: TMDbMovie[] }
  | { status: 'error' }

async function getMovies(): Promise<FeaturedMoviesResult> {
  try {
    const data = await getTrendingMovies('week')
    return { status: 'success', movies: data.results.slice(0, 12) }
  } catch {
    return { status: 'error' }
  }
}

export default async function FeaturedMovies() {
  const result = await getMovies()

  return (
    <div className="min-w-0 overflow-hidden bg-ns-bg px-4 py-14 sm:px-6 sm:py-20">
      <Section
        title="FEATURED FILMS"
        note="Trending this week. Discover without spoilers."
        className="mx-auto w-full max-w-6xl"
      >
        {result.status === 'error' ? (
          <FeaturedMoviesError />
        ) : result.movies.length > 0 ? (
          <div
            className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4
                       scrollbar-hide sm:-mx-6 sm:scroll-px-6 sm:px-6"
            aria-label="Featured films"
          >
            {result.movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} size="md" />
            ))}
          </div>
        ) : (
          <EmptyFeaturedMovies />
        )}
      </Section>
    </div>
  )
}

function FeaturedMoviesError() {
  return (
    <div className="border-t border-ns-danger/40 pt-5" role="alert">
      <h3 className="font-heading text-lg text-ns-text">Featured films are off-screen</h3>
      <p className="mt-1 max-w-md font-body text-sm leading-relaxed text-ns-muted">
        Trending titles could not be loaded right now. The rest of NoSpoilers is still ready to explore.
      </p>
      <RefreshButton
        label="Try loading films again"
        className="mt-5 inline-flex min-h-10 items-center rounded border border-ns-text/70 px-5 py-2.5 font-heading text-sm font-semibold text-ns-text transition-colors hover:bg-ns-text hover:text-ns-bg disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg"
      />
    </div>
  )
}

function EmptyFeaturedMovies() {
  return (
    <div className="border-t border-ns-border pt-5">
      <h3 className="font-heading text-lg text-ns-text">A new lineup is coming soon</h3>
      <p className="mt-1 max-w-md font-body text-sm text-ns-muted">
        There are no featured films in this week&apos;s slate yet.
      </p>
    </div>
  )
}
