import Image from 'next/image'
import Link from 'next/link'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import {
  getMovieById,
  getMovieCredits,
  getMovieVideos,
  getMovieRecommendations,
  getMovieSimilar,
  getMovieKeywords,
  getMovieWatchProviders,
} from '@/services/tmdb'
import { computeMovieVibe } from '@/services/movie-vibe'
import { makeCondensedPremise, generateAudienceProfile } from '@/services/spoiler-free'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import MovieVibeProfile from '@/components/movie/MovieVibeProfile'
import RomComDnaRoast, { type RoastAccess } from '@/components/movie/RomComDnaRoast'
import WhoWouldEnjoy from '@/components/movie/WhoWouldEnjoy'
import SimilarMovies from '@/components/movie/SimilarMovies'
import WhereToWatch from '@/components/movie/WhereToWatch'
import MovieSpoilerSafety from '@/components/movie/MovieSpoilerSafety'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import RatingWidget from '@/components/ratings/RatingWidget'
import ReviewSection from '@/components/reviews/ReviewSection'
import SpoilerZone   from '@/components/spoiler-zone/SpoilerZone'
import { selectMovieTrailers } from '@/lib/movie-trailers'
import { selectRelatedMovies } from '@/lib/movie-quality'
import { absoluteUrl, movieSearchDescription, parseCatalogId, publicPageMetadata } from '@/lib/seo'
import { getGuideForGenre, guidePath } from '@/lib/movie-guides'
import { authOptions } from '@/lib/auth'
import { isRomComMovie, type RomComRoastResult } from '@/lib/rom-com-roast'
import { getRomComRoastForUser } from '@/services/rom-com-roast'
import JsonLd from '@/components/seo/JsonLd'
import Badge from '@/components/ui/Badge'
import PosterImage from '@/components/discover/PosterImage'
import { StarIcon } from '@/components/icons'

interface Props {
  params: Promise<{ tmdbId: string }>
}

const getPageMovie = cache((id: number) => getMovieById(id).catch(() => null))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tmdbId } = await params
  const id = parseCatalogId(tmdbId)
  if (id === null) notFound()
  const movie = await getPageMovie(id)
  if (!movie) notFound()
  const year = movie.release_date?.slice(0, 4)
  const metadata = publicPageMetadata({
    title: `${movie.title}${year ? ` (${year})` : ''} — Spoiler-Free Movie Guide`,
    description: movieSearchDescription(movie),
    path: `/movie/${movie.id}`,
    image: movie.backdrop_path || movie.poster_path ? {
      url: tmdbImageUrl(movie.backdrop_path || movie.poster_path, 'original'),
      alt: movie.title,
    } : undefined,
  })
  if (movie.adult) metadata.robots = { index: false, follow: true }
  return metadata
}

export default async function MoviePage({ params }: Props) {
  const { tmdbId } = await params
  const id = parseCatalogId(tmdbId)
  if (id === null) notFound()

  const requestHeaders = await headers()
  const detectedRegion = requestHeaders.get('x-vercel-ip-country')?.toUpperCase()
  const watchRegion = detectedRegion && /^[A-Z]{2}$/.test(detectedRegion) ? detectedRegion : 'US'

  const [movie, credits, videos, recommendations, similar, keywords, watchAvailability] = await Promise.all([
    getPageMovie(id),
    getMovieCredits(id).catch(() => ({ id, cast: [], crew: [] })),
    getMovieVideos(id).catch(() => ({ id, results: [] })),
    getMovieRecommendations(id).catch(() => ({ results: [] })),
    getMovieSimilar(id).catch(() => ({ results: [] })),
    getMovieKeywords(id).catch(() => [] as string[]),
    getMovieWatchProviders(id, watchRegion).catch(() => null),
  ])

  if (!movie) notFound()

  const director     = credits.crew.find(c => c.job === 'Director')
  const topCast      = credits.cast.slice(0, 8)
  const trailers     = selectMovieTrailers(videos.results)
  const condensedPremise = makeCondensedPremise(movie.overview)
  const audience     = generateAudienceProfile(movie)
  // Use the full movie object — detail endpoint returns `genres`, not `genre_ids`
  const vibe         = computeMovieVibe(movie, keywords)
  const genreIds     = movie.genres.map(genre => genre.id)
  const isRomCom     = isRomComMovie(genreIds)
  const relatedMovies = selectRelatedMovies(
    movie,
    recommendations.results ?? [],
    similar.results ?? [],
  )
  const runtime    = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  let roastAccess: RoastAccess = 'signed-out'
  let romComRoast: RomComRoastResult | null = null

  if (isRomCom) {
    const session = await getServerSession(authOptions)
    if (session) {
      try {
        romComRoast = await getRomComRoastForUser(session.user.id, {
          tmdbId: movie.id,
          title: movie.title,
          genreIds,
          keywords,
          releaseDate: movie.release_date ?? null,
          runtime: movie.runtime,
          movieDNA: vibe,
        })
        roastAccess = romComRoast ? 'ready' : 'needs-dna'
      } catch (error) {
        console.error('[rom-com-roast]', error)
        roastAccess = 'unavailable'
      }
    }
  }

  return (
    <div className="relative isolate">
      {/* Color wash from the poster only. Film stills could show cast or story. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden">
        {movie.poster_path && (
          <Image
            src={tmdbImageUrl(movie.poster_path, 'w342')}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-40 blur-3xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ns-bg/40 via-ns-bg/75 to-ns-bg" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:pb-24">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Movie',
            '@id': `${absoluteUrl(`/movie/${movie.id}`)}#movie`,
            url: absoluteUrl(`/movie/${movie.id}`),
            name: movie.title,
            description: movieSearchDescription(movie),
            image: movie.poster_path ? tmdbImageUrl(movie.poster_path, 'w500') : undefined,
            datePublished: movie.release_date || undefined,
            dateCreated: movie.release_date || undefined,
            duration: movie.runtime && movie.runtime > 0 ? `PT${movie.runtime}M` : undefined,
            genre: movie.genres.map(genre => genre.name),
            director: director ? { '@type': 'Person', name: director.name } : undefined,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'NoSpoilers', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Discover movies', item: absoluteUrl('/discover') },
              { '@type': 'ListItem', position: 3, name: movie.title, item: absoluteUrl(`/movie/${movie.id}`) },
            ],
          },
        ],
      }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ns-muted sm:mb-6">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-2">
          <li><Link href="/" className="inline-flex min-h-11 items-center transition-colors hover:text-ns-text">NoSpoilers</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/discover" className="inline-flex min-h-11 items-center transition-colors hover:text-ns-text">Discover movies</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="min-w-0 truncate text-ns-text">{movie.title}</li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-end lg:gap-14">
        <div className="relative mx-auto aspect-[2/3] w-56 overflow-hidden rounded-xl bg-ns-surface shadow-2xl ring-1 ring-inset ring-white/5 sm:w-64 lg:mx-0 lg:w-full">
          <PosterImage
            path={movie.poster_path}
            size="w500"
            alt={movie.title}
            sizes="(min-width: 1024px) 352px, 256px"
            preload
          />
        </div>

        <div className="min-w-0">
          {movie.genres.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
              {movie.genres.map(genre => {
                const guide = getGuideForGenre(genre.id)
                return guide ? (
                  <Link
                    key={genre.id}
                    href={guidePath(guide)}
                    aria-label={`${genre.name}: see ${guide.label.toLowerCase()}`}
                    className="group inline-flex min-h-10 items-center rounded-full"
                  >
                    <Badge size="md" className="transition-colors duration-150 group-hover:bg-ns-surface-3 group-hover:text-ns-text">{genre.name}</Badge>
                  </Link>
                ) : (
                  <Badge key={genre.id} size="md">{genre.name}</Badge>
                )
              })}
            </div>
          )}

          <h1 className="break-words font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl xl:text-8xl">
            {movie.title}
          </h1>

          {movie.tagline && (
            <p className="mt-4 max-w-2xl text-xl italic leading-snug text-ns-muted">“{movie.tagline}”</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-base tabular-nums text-ns-muted">
            <span>{formatYear(movie.release_date)}</span>
            {runtime && (
              <>
                <span aria-hidden="true">·</span>
                <span>{runtime}</span>
              </>
            )}
            {movie.vote_average > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ns-text">
                  <StarIcon size={15} className="text-ns-secondary-readable" />
                  {movie.vote_average.toFixed(1)} TMDb
                </span>
              </>
            )}
            {director && (
              <>
                <span aria-hidden="true">·</span>
                <span>Directed by <span className="text-ns-text">{director.name}</span></span>
              </>
            )}
          </div>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ns-muted">{movieSearchDescription(movie)}</p>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {watchAvailability && watchAvailability.providers.length > 0 && (
              <WhereToWatch
                movieTitle={movie.title}
                providers={watchAvailability.providers}
                region={watchAvailability.region}
              />
            )}
            <RatingWidget
              movie={{
                tmdbId:      movie.id,
                title:       movie.title,
                posterPath:  movie.poster_path,
                releaseDate: movie.release_date ?? null,
                genreIds:    movie.genres.map(g => g.id),
                runtime:     movie.runtime,
                voteAverage: movie.vote_average,
                voteCount:   movie.vote_count,
                popularity:  movie.popularity,
                originalLanguage: movie.original_language,
                budget:      movie.budget,
                keywords,
              }}
            />
            <AddToWatchlistButton
              movie={{
                tmdbId:      movie.id,
                title:       movie.title,
                posterPath:  movie.poster_path,
                releaseDate: movie.release_date,
                // movie detail endpoint returns `genres:[{id,name}]`, NOT `genre_ids`
                // derive the id array from the genres array that actually exists
                genreIds:    movie.genres?.map(g => g.id) ?? movie.genre_ids ?? [],
                runtime:     movie.runtime,
                voteAverage: movie.vote_average,
              }}
            />
            <AddToCollectionButton
              movie={{
                tmdbId:      movie.id,
                title:       movie.title,
                posterPath:  movie.poster_path,
                releaseDate: movie.release_date ?? null,
              }}
            />
          </div>

        </div>
      </div>

      <div className="mt-10 space-y-12 lg:mt-14 lg:space-y-16">
        <MovieSpoilerSafety
          movieTitle={movie.title}
          overview={movie.overview}
          condensedPremise={condensedPremise}
          cast={topCast}
          trailers={trailers}
        />

        {isRomCom && (
          <RomComDnaRoast
            movieTitle={movie.title}
            tmdbId={movie.id}
            access={roastAccess}
            result={romComRoast}
          />
        )}

        {/* Vibe + Audience grid */}
        <div className="ns-reveal grid gap-5 lg:grid-cols-2">
          <MovieVibeProfile scores={vibe} />
          <WhoWouldEnjoy wouldEnjoy={audience.wouldEnjoy} mightNotEnjoy={audience.mightNotEnjoy} />
        </div>

        {/* Similar movies */}
        <SimilarMovies movieTitle={movie.title} matches={relatedMovies} />

        {/* Community reviews */}
        <ReviewSection tmdbId={movie.id} movieTitle={movie.title} />

        {/* Spoiler Zone */}
        <SpoilerZone tmdbId={movie.id} movieTitle={movie.title} />
      </div>
      </div>
    </div>
  )
}
