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
import DiscoverScrollScene from '@/components/discover/DiscoverScrollScene'
import SearchModal from '@/components/ui/SearchModal'
import PageHeader from '@/components/ui/PageHeader'
import { curateDistinctMovieShelf } from '@/lib/movie-quality'
import type { TMDbMovie } from '@/types'

export const metadata = publicPageMetadata({
  title: 'Discover Movies — Trending, Top Rated & Hidden Gems',
  description: 'Browse trending movies, new releases, top-rated films, and hidden gems. Discover drama, thriller, sci-fi, and comedy with spoiler controls on NoSpoilers.',
  path: '/discover',
})

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

  const sections = [
    { title: 'Trending This Week', eyebrow: 'Hot right now', movies: trendingMovies },
    { title: 'Popular Now', eyebrow: "Everyone's watching", movies: popularMovies },
    { title: 'Now in Theatres', eyebrow: 'New releases', movies: nowPlayingMovies },
    { title: 'Top Rated All Time', eyebrow: 'Acclaimed by thousands', movies: topRatedMovies },
    { title: 'Hidden Gems', eyebrow: 'Highly rated, underseen', movies: hiddenGemMovies },
    ...GENRE_ROWS.map((genre, index) => ({
      title: genre.label,
      movies: genreMovies[index],
    })),
  ].filter(section => section.movies.length >= 4)

  return (
    <DiscoverScrollScene sectionCount={sections.length}>
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16">
        <PageHeader
          title="DISCOVER MOVIES "
          accent="WITHOUT THE NOISE"
          lede={
            <>
              Find movies to watch: trending films, acclaimed classics, and hidden gems.
              You control when synopsis, cast, and trailer details are revealed.
            </>
          }
        >
          <div className="w-full min-w-0">
            <SearchModal />
          </div>
        </PageHeader>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-ns-muted">
          Looking for a personal starting point?{' '}
          <Link href="/movie-recommendations" className="text-ns-secondary-readable underline underline-offset-4">
            Learn how to find movie recommendations for your taste.
          </Link>
        </p>

        <div className="mt-12 flex flex-col gap-14">
          {sections.map((section, index) => (
            <DiscoverSection
              key={section.title}
              {...section}
              index={index}
              total={sections.length}
            />
          ))}
        </div>
      </div>
    </DiscoverScrollScene>
  )
}
