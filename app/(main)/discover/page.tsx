import Link from 'next/link'
import { publicPageMetadata } from '@/lib/seo'
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlaying,
  getHiddenGems,
  getMoviesByGenre,
} from '@/services/tmdb'
import DiscoverSection from '@/components/discover/DiscoverSection'
import DiscoverFeatured, { type FeaturedFilm } from '@/components/discover/DiscoverFeatured'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import SearchModal from '@/components/ui/SearchModal'
import { curateDistinctMovieShelf } from '@/lib/movie-quality'
import { formatRating, formatYear } from '@/lib/utils'
import type { TMDbMovie } from '@/types'

export const metadata = publicPageMetadata({
  title: 'Discover Movies — Trending, Top Rated & Hidden Gems',
  description: 'Browse trending movies, new releases, top-rated films, and hidden gems. Discover drama, thriller, sci-fi, and comedy with spoiler controls on NoSpoilers.',
  path: '/discover',
})

const GENRE_ROWS = [
  { id: 18, label: 'Drama'         },
  { id: 53, label: 'Thriller'      },
  { id: 878, label: 'Science Fiction'},
  { id: 35, label: 'Comedy'        },
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

  function movies(result: PromiseSettledResult<{ results: TMDbMovie[] }>) {
    return result.status === 'fulfilled' ? result.value.results : []
  }

  // A title gets one editorial home on this page. This prevents Trending,
  // Popular, and genre rows from becoming minor reshuffles of the same films.
  const seenMovieIds = new Set<number>()
  const shelfLimit = 10
  const trendingMovies = curateDistinctMovieShelf(movies(trending), seenMovieIds, {
    limit: shelfLimit,
    minVoteCount: 50,
  })
  const popularMovies = curateDistinctMovieShelf(movies(popular), seenMovieIds, {
    limit: shelfLimit,
    minVoteCount: 200,
  })
  const nowPlayingMovies = curateDistinctMovieShelf(movies(nowPlaying), seenMovieIds, {
    limit: shelfLimit,
    minVoteCount: 15,
  })
  const topRatedMovies = curateDistinctMovieShelf(movies(topRated), seenMovieIds, {
    limit: shelfLimit,
    minVoteCount: 2_000,
    minRating: 7.2,
  })
  const hiddenGemMovies = curateDistinctMovieShelf(movies(hidden), seenMovieIds, {
    limit: shelfLimit,
    minVoteCount: 100,
    maxVoteCount: 2_000,
    minRating: 7,
    minPopularity: 2,
    maxPopularity: 35,
  })
  const genreMovies = GENRE_ROWS.map((_, index) => curateDistinctMovieShelf(
    movies(genreResults[index]),
    seenMovieIds,
    { limit: shelfLimit, minVoteCount: 100, minRating: 5.5 },
  ))

  const sections: Array<{ title: string; description?: string; movies: TMDbMovie[] }> = [
    { title: 'Trending this week', movies: trendingMovies },
    { title: 'Popular now', movies: popularMovies },
    { title: 'Now in theatres', movies: nowPlayingMovies },
    { title: 'Top rated all time', description: 'Acclaimed by thousands', movies: topRatedMovies },
    { title: 'Hidden gems', description: 'Highly rated, underseen', movies: hiddenGemMovies },
    ...GENRE_ROWS.map((genre, index) => ({
      title: genre.label,
      movies: genreMovies[index],
    })),
  ].filter(section => section.movies.length >= 4)

  // The lead shelf's top titles move into the featured stage, so they are not
  // repeated in the rail directly beneath it. Short shelves feature one title.
  const leadMovies = sections[0]?.movies ?? []
  const featuredCount = leadMovies.length >= 8 ? 4 : 1
  const featured: FeaturedFilm[] = leadMovies.slice(0, featuredCount).map(movie => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    year: formatYear(movie.release_date),
    rating: movie.vote_average > 0 ? formatRating(movie.vote_average) : null,
  }))
  const rails = sections.map((section, index) => (
    index === 0 ? { ...section, movies: section.movies.slice(featuredCount) } : section
  ))

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:pb-24">
      <PageHeader
        title="Discover movies"
        description="Find movies to watch: trending films, acclaimed classics, and hidden gems. You control when synopsis, cast, and trailer details are revealed."
        actions={<div className="w-full sm:w-64 xl:hidden"><SearchModal enableShortcut={false} /></div>}
      />

      {sections.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Movies could not load"
          description="We could not reach the movie catalog. Try again, or search for a specific title."
          action={<Button href="/discover">Try again</Button>}
        />
      ) : (
        <>
          <div className="mt-8 lg:mt-10">
            <DiscoverFeatured films={featured} />
          </div>

          <div className="mt-12 space-y-12 lg:mt-16 lg:space-y-16">
            {rails.map(section => (
              <DiscoverSection key={section.title} {...section} />
            ))}
          </div>
        </>
      )}

      <p className="ns-reveal mt-14 max-w-2xl text-base leading-relaxed text-ns-muted lg:mt-20">
        Looking for a personal starting point?{' '}
        <Link
          href="/movie-recommendations"
          className="font-semibold text-ns-text underline decoration-ns-border-strong underline-offset-4 transition-colors hover:decoration-ns-text"
        >
          Learn how to find movie recommendations for your taste.
        </Link>
      </p>
    </div>
  )
}
