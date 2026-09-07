import Image from 'next/image'
import Link from 'next/link'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
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
  const relatedMovies = selectRelatedMovies(
    movie,
    recommendations.results ?? [],
    similar.results ?? [],
  )
  const runtime    = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
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

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-8 mb-12">
        {/* Poster */}
        <div className="flex-shrink-0">
          <div className="relative w-[200px] sm:w-[240px] aspect-[2/3] rounded-2xl overflow-hidden
                          border border-ns-border shadow-2xl shadow-black/60 mx-auto sm:mx-0">
            <Image
              src={tmdbImageUrl(movie.poster_path, 'w500')}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="240px"
              priority
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4 justify-center">
          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {movie.genres.map(g => (
              <span key={g.id}
                className="px-2.5 py-1 rounded-full border border-ns-border text-ns-muted text-xs font-body">
                {g.name}
              </span>
            ))}
          </div>

          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text leading-none">
            {movie.title.toUpperCase()}
          </h1>

          <p className="max-w-xl text-sm leading-6 text-ns-muted">{movieSearchDescription(movie)}</p>

          {movie.tagline && (
            <p className="text-ns-muted font-body text-sm italic">"{movie.tagline}"</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-body text-ns-muted">
            <span>{formatYear(movie.release_date)}</span>
            {runtime && <span>{runtime}</span>}
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1.5 text-ns-secondary-readable font-semibold">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                {movie.vote_average.toFixed(1)} TMDb
              </span>
            )}
          </div>

          {director && (
            <p className="text-ns-muted text-sm font-body">
              Directed by <span className="text-ns-text">{director.name}</span>
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-2 flex flex-wrap gap-2">
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

      <MovieSpoilerSafety
        movieTitle={movie.title}
        overview={movie.overview}
        condensedPremise={condensedPremise}
        cast={topCast}
        trailers={trailers}
      />

      {/* Vibe + Audience grid */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <MovieVibeProfile scores={vibe} />
        <WhoWouldEnjoy wouldEnjoy={audience.wouldEnjoy} mightNotEnjoy={audience.mightNotEnjoy} />
      </div>

      {/* Similar movies */}
      <SimilarMovies matches={relatedMovies} />

      {/* Community reviews */}
      <ReviewSection tmdbId={movie.id} movieTitle={movie.title} />

      {/* Spoiler Zone */}
      <SpoilerZone tmdbId={movie.id} movieTitle={movie.title} />
    </div>
  )
}
