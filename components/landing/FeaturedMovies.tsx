import MovieCard from '@/components/ui/MovieCard'
import RefreshButton from '@/components/ui/RefreshButton'
import { WarningIcon } from '@/components/icons'
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
    <section className="bg-ns-bg py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-ns-secondary text-xs tracking-[0.2em] uppercase font-body mb-2">
              Trending this week
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text">
              FEATURED FILMS
            </h2>
          </div>
          <p className="text-ns-muted text-sm font-body hidden sm:block">
            Discover without spoilers
          </p>
        </div>

        {/* Movie cards scroll row */}
        {result.status === 'error' ? (
          <FeaturedMoviesError />
        ) : result.movies.length > 0 ? (
          <div>
            <div
              className="flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto pb-4
                         scrollbar-hide -mx-6 px-6"
              aria-label="Featured films"
            >
              {result.movies.map(movie => (
                <MovieCard key={movie.id} movie={movie} size="md" />
              ))}
            </div>
            <p className="mt-1 text-center text-[10px] font-body uppercase tracking-[0.18em] text-ns-muted/60 sm:hidden">
              Swipe to explore
            </p>
          </div>
        ) : (
          <EmptyFeaturedMovies />
        )}
      </div>
    </section>
  )
}

function FeaturedMoviesError() {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-ns-danger/30 bg-ns-surface px-6 py-10 text-center"
      role="alert"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-ns-danger/10 text-ns-danger">
        <WarningIcon size={19} />
      </div>
      <h3 className="font-heading text-lg text-ns-text">Featured films are off-screen</h3>
      <p className="mt-1 max-w-md font-body text-sm leading-relaxed text-ns-muted">
        Trending titles could not be loaded right now. The rest of NoSpoilers is still ready to explore.
      </p>
      <RefreshButton
        label="Try loading films again"
        className="mt-5 rounded-lg bg-ns-secondary px-4 py-2 font-body text-xs font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/85 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-surface"
      />
    </div>
  )
}

function EmptyFeaturedMovies() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-ns-border bg-ns-surface px-6 py-10 text-center">
      <h3 className="font-heading text-lg text-ns-text">A new lineup is coming soon</h3>
      <p className="mt-1 max-w-md font-body text-sm text-ns-muted">
        There are no featured films in this week&apos;s slate yet.
      </p>
    </div>
  )
}
