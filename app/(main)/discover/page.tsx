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
import DiscoverScrollScene from '@/components/discover/DiscoverScrollScene'
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

  const sections = [
    { title: 'Trending This Week', eyebrow: 'Hot right now', movies: movies(trending) },
    { title: 'Popular Now', eyebrow: "Everyone's watching", movies: movies(popular) },
    { title: 'Now in Theatres', eyebrow: 'New releases', movies: movies(nowPlaying) },
    { title: 'Top Rated All Time', eyebrow: 'Acclaimed', movies: movies(topRated) },
    { title: 'Hidden Gems', eyebrow: 'Underrated', movies: movies(hidden) },
    ...GENRE_ROWS.map((genre, index) => ({
      title: genre.label,
      eyebrow: 'Genre',
      movies: movies(genreResults[index]),
    })),
  ].filter(section => section.movies.length > 0)

  return (
    <DiscoverScrollScene sectionCount={sections.length}>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-16">
        <header className="discover-hero discover-theater relative mb-20 overflow-hidden rounded-[1.75rem] border border-ns-border/90 bg-ns-bg px-2 pb-14 pt-14 shadow-[0_34px_110px_rgb(var(--ns-bg)/0.82)] sm:mb-24 sm:rounded-[2.5rem] sm:px-5 sm:pb-20 sm:pt-16 lg:mb-32 lg:px-8">
          <div className="discover-theater-fascia pointer-events-none absolute inset-x-0 top-0 z-30 h-14" aria-hidden="true">
            <div className="discover-theater-lights mx-auto flex h-full max-w-5xl items-center justify-between px-8 sm:px-16">
              {Array.from({ length: 11 }).map((_, lightIndex) => (
                <span key={lightIndex} />
              ))}
            </div>
          </div>

          <div className="discover-theater-curtain discover-theater-curtain-left pointer-events-none absolute bottom-14 left-0 top-10 z-20 hidden w-16 sm:block lg:w-24" aria-hidden="true" />
          <div className="discover-theater-curtain discover-theater-curtain-right pointer-events-none absolute bottom-14 right-0 top-10 z-20 hidden w-16 sm:block lg:w-24" aria-hidden="true" />

          <div className="discover-theater-frame relative z-10 rounded-[1.35rem] p-2 sm:p-3 lg:p-4">
            <div className="discover-theater-screen relative min-h-[30rem] overflow-hidden rounded-xl border border-ns-text/10 px-4 py-8 sm:px-12 sm:py-10 lg:min-h-[34rem] lg:px-16 lg:py-12">
              <div className="discover-hero-orbit pointer-events-none absolute -right-24 -top-28 h-[34rem] w-[34rem] rounded-full border border-ns-secondary/20" aria-hidden="true">
                <span className="absolute inset-10 rounded-full border border-ns-secondary/10" />
                <span className="absolute inset-24 rounded-full border border-ns-text/5" />
              </div>
              <div className="discover-projector-wash pointer-events-none absolute inset-0" aria-hidden="true" />

              <div className="relative flex min-h-[25rem] flex-col justify-between lg:min-h-[28rem]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="inline-flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.24em] text-ns-secondary">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ns-secondary opacity-50 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-ns-secondary" />
                    </span>
                    Now showing // NoSpoilers
                  </p>
                  <p className="font-body text-[10px] uppercase tracking-[0.22em] text-ns-muted/60">
                    {String(sections.length).padStart(2, '0')} curated screenings
                  </p>
                </div>

                <div className="my-10 max-w-4xl lg:my-12">
                  <p className="mb-3 font-body text-xs uppercase tracking-[0.28em] text-ns-muted/65">
                    Feature presentation
                  </p>
                  <h1 className="font-display text-[clamp(2.65rem,14vw,10rem)] leading-[0.82] tracking-[0.04em] text-ns-text sm:tracking-[0.055em]">
                    DISCOVER
                  </h1>
                  <p className="discover-outline-title mt-3 whitespace-nowrap font-display text-[clamp(1.1rem,5.5vw,4.8rem)] leading-none tracking-[0.04em] sm:tracking-[0.08em]">
                    WITHOUT THE NOISE
                  </p>
                </div>

                <div className="flex flex-col gap-6 border-t border-ns-border/70 pt-6 sm:flex-row sm:items-end sm:justify-between">
                  <p className="max-w-xl font-body text-sm leading-relaxed text-ns-muted sm:text-base">
                    Move through live trends, acclaimed classics, and hidden signals.
                    Every film stays spoiler-free until you choose to go deeper.
                  </p>
                  <div className="w-full flex-shrink-0 sm:w-auto">
                    <SearchModal />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="discover-theater-stage pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20" aria-hidden="true">
            <div className="discover-theater-floor absolute inset-x-[8%] bottom-0 h-16" />
            <div className="discover-theater-seats absolute inset-x-0 -bottom-5 hidden items-end justify-center gap-1.5 sm:flex lg:gap-3">
              {Array.from({ length: 13 }).map((_, seatIndex) => (
                <span
                  key={seatIndex}
                  className="discover-theater-seat relative block"
                  style={{ transform: `scale(${0.76 + Math.abs(6 - seatIndex) * 0.025})` }}
                >
                  <i />
                  <b />
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="relative">
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
