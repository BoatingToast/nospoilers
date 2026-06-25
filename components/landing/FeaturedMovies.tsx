import MovieCard from '@/components/ui/MovieCard'
import { getTrendingMovies } from '@/services/tmdb'
import type { TMDbMovie } from '@/types'

async function getMovies(): Promise<TMDbMovie[]> {
  try {
    const data = await getTrendingMovies('week')
    return data.results.slice(0, 12)
  } catch {
    return []
  }
}

export default async function FeaturedMovies() {
  const movies = await getMovies()

  return (
    <section className="bg-ns-bg py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-ns-gold text-xs tracking-[0.2em] uppercase font-body mb-2">
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
        {movies.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} size="md" />
            ))}
          </div>
        ) : (
          <PlaceholderRow />
        )}
      </div>
    </section>
  )
}

function PlaceholderRow() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[185px] h-[278px] rounded-xl bg-ns-surface border border-ns-border
                     animate-pulse"
        />
      ))}
    </div>
  )
}
