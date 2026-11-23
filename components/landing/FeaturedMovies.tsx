import EmptyState from '@/components/ui/EmptyState'
import MovieCard from '@/components/ui/MovieCard'
import RefreshButton from '@/components/ui/RefreshButton'
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
    <section className="mt-6 overflow-hidden bg-ns-surface px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-[77rem]">
        <div className="ns-reveal mb-8">
          <h2 className="font-display text-4xl text-ns-text sm:text-5xl">Featured films.</h2>
          <p className="mt-2 text-lg text-ns-muted">Trending this week</p>
        </div>

        {result.status === 'error' ? (
          <div role="alert">
            <EmptyState
              className="!bg-ns-bg"
              title="Featured films are off-screen"
              description="Trending titles could not be loaded right now. The rest of NoSpoilers is still ready to explore."
              action={(
                <RefreshButton
                  label="Try loading films again"
                  className="min-h-11 rounded-full bg-ns-secondary px-5 font-body text-sm font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90 disabled:cursor-wait disabled:opacity-60"
                />
              )}
            />
          </div>
        ) : result.movies.length > 0 ? (
          <div
            className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:scroll-px-6 sm:px-6"
            aria-label="Featured films"
          >
            {result.movies.map((movie, index) => (
              <div key={movie.id} className="ns-reveal flex-shrink-0" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
                <MovieCard movie={movie} size="md" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="!bg-ns-bg"
            title="A new lineup is coming soon"
            description="There are no featured films in this week's slate yet."
          />
        )}
      </div>
    </section>
  )
}
