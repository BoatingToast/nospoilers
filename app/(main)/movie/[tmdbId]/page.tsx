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
import { authOptions } from '@/lib/auth'
import { isRomComMovie, type RomComRoastResult } from '@/lib/rom-com-roast'
import { getRomComRoastForUser } from '@/services/rom-com-roast'
import JsonLd from '@/components/seo/JsonLd'

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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
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
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-ns-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-ns-text">NoSpoilers</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/discover" className="hover:text-ns-text">Discover movies</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{movie.title}</li>
        </ol>
      </nav>

      {/* Hero: poster beside a left-aligned title, facts under a heavy rule */}
      <header className="grid min-w-0 gap-6 border-b border-ns-border pb-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-end sm:gap-10">
        <div className="relative aspect-[2/3] w-[200px] max-w-full overflow-hidden rounded border border-ns-border bg-ns-surface sm:w-full sm:max-w-[340px]">
          <Image
            src={tmdbImageUrl(movie.poster_path, 'w500')}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 200px, 340px"
            priority
          />
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-[clamp(2.6rem,9vw,5.5rem)] leading-[0.88] tracking-wide text-ns-text">
            {movie.title.toUpperCase()}
          </h1>

          <div className="mt-6 flex flex-col gap-3 border-t-2 border-ns-text pt-4">
            <p className="max-w-xl font-body text-base leading-relaxed text-ns-text">{movieSearchDescription(movie)}</p>

            {movie.tagline && (
              <p className="font-body text-sm italic text-ns-muted">"{movie.tagline}"</p>
            )}

            {/* Facts: year, runtime, score, genres */}
            <p className="font-body text-sm text-ns-muted">
              {[formatYear(movie.release_date), runtime].filter(Boolean).join(' · ')}
              {movie.vote_average > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-ns-secondary-readable">{movie.vote_average.toFixed(1)} TMDb</span>
                </>
              )}
            </p>

            {movie.genres.length > 0 && (
              <p className="font-body text-sm text-ns-muted">
                {movie.genres.map(g => g.name).join(' · ')}
              </p>
            )}

            {director && (
              <p className="font-body text-sm text-ns-muted">
                Directed by <span className="text-ns-text">{director.name}</span>
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
      </header>

      <div className="mt-12 flex flex-col gap-14">
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

        {/* Vibe + audience */}
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-10">
          <MovieVibeProfile scores={vibe} />
          <WhoWouldEnjoy wouldEnjoy={audience.wouldEnjoy} mightNotEnjoy={audience.mightNotEnjoy} />
        </div>

        {/* Similar movies */}
        <SimilarMovies matches={relatedMovies} />

        {/* Community reviews */}
        <ReviewSection tmdbId={movie.id} movieTitle={movie.title} />
      </div>

      {/* Spoiler Zone */}
      <SpoilerZone tmdbId={movie.id} movieTitle={movie.title} />
    </div>
  )
}
