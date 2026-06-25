import type { Metadata } from 'next'
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlaying,
  getHiddenGems,
  getMoviesByGenre,
} from '@/services/tmdb'
import DiscoverSection from '@/components/discover/DiscoverSection'
import SearchModal from '@/components/ui/SearchModal'

export const metadata: Metadata = { title: 'Discover | NoSpoilers' }

const GENRE_ROWS = [
  { id: 18,   label: 'Drama'         },
  { id: 53,   label: 'Thriller'      },
  { id: 878,  label: 'Science Fiction'},
  { id: 35,   label: 'Comedy'        },
]

export default async function DiscoverPage() {
  // Parallel fetch all sections — each fails gracefully
  const [trending, popular, topRated, nowPlaying, hidden, ...genreResults] =
    await Promise.allSettled([
      getTrendingMovies('week'),
      getPopularMovies(),
      getTopRatedMovies(),
      getNowPlaying(),
      getHiddenGems(),
      ...GENRE_ROWS.map(g => getMoviesByGenre(g.id)),
    ])

  function movies(result: PromiseSettledResult<{ results: import('@/types').TMDbMovie[] }>) {
    return result.status === 'fulfilled' ? result.value.results.slice(0, 16) : []
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-ns-gold text-xs tracking-[0.2em] uppercase font-body mb-2">Browse</p>
          <h1 className="font-display text-6xl sm:text-7xl tracking-wider text-ns-text">DISCOVER</h1>
          <p className="text-ns-muted font-body text-sm mt-2">
            Explore films without spoilers. Click any movie to learn more.
          </p>
        </div>
        <SearchModal />
      </div>

      <DiscoverSection title="Trending This Week" eyebrow="Hot right now"  movies={movies(trending)}  />
      <DiscoverSection title="Popular Now"         eyebrow="Everyone's watching" movies={movies(popular)}   />
      <DiscoverSection title="Now in Theatres"     eyebrow="New releases"  movies={movies(nowPlaying)} />
      <DiscoverSection title="Top Rated All Time"  eyebrow="Acclaimed"     movies={movies(topRated)}  />
      <DiscoverSection title="Hidden Gems"         eyebrow="Underrated"    movies={movies(hidden)}    />

      {GENRE_ROWS.map((genre, i) => (
        <DiscoverSection
          key={genre.id}
          title={genre.label}
          eyebrow="Genre"
          movies={movies(genreResults[i])}
        />
      ))}
    </div>
  )
}
