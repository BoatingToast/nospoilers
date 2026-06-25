import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMovieById, getMovieCredits, getMovieSimilar, getMovieKeywords } from '@/services/tmdb'
import { computeMovieVibe } from '@/services/movie-vibe'
import { makeSpoilerFree, generateAudienceProfile } from '@/services/spoiler-free'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import MovieVibeProfile from '@/components/movie/MovieVibeProfile'
import WhoWouldEnjoy from '@/components/movie/WhoWouldEnjoy'
import SimilarMovies from '@/components/movie/SimilarMovies'
import AddToWatchlistButton from '@/components/watchlist/AddToWatchlistButton'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import RatingWidget from '@/components/ratings/RatingWidget'
import ReviewSection from '@/components/reviews/ReviewSection'
import SpoilerZone   from '@/components/spoiler-zone/SpoilerZone'

interface Props {
  params: Promise<{ tmdbId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tmdbId } = await params
  try {
    const movie = await getMovieById(parseInt(tmdbId, 10))
    return { title: `${movie.title} | NoSpoilers` }
  } catch {
    return { title: 'Movie | NoSpoilers' }
  }
}

export default async function MoviePage({ params }: Props) {
  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (isNaN(id)) notFound()

  const [movie, credits, similar, keywords] = await Promise.all([
    getMovieById(id).catch(() => null),
    getMovieCredits(id).catch(() => ({ id, cast: [], crew: [] })),
    getMovieSimilar(id).catch(() => ({ results: [] })),
    getMovieKeywords(id).catch(() => [] as string[]),
  ])

  if (!movie) notFound()

  const director     = credits.crew.find(c => c.job === 'Director')
  const topCast      = credits.cast.slice(0, 8)
  const safeOverview = makeSpoilerFree(movie.overview)
  const audience     = generateAudienceProfile(movie)
  // Use the full movie object — detail endpoint returns `genres`, not `genre_ids`
  const vibe         = computeMovieVibe(movie, keywords)
  const runtime    = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

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

          {movie.tagline && (
            <p className="text-ns-muted font-body text-sm italic">"{movie.tagline}"</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-body text-ns-muted">
            <span>{formatYear(movie.release_date)}</span>
            {runtime && <span>{runtime}</span>}
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1.5 text-ns-gold font-semibold">
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
            <RatingWidget
              movie={{
                tmdbId:      movie.id,
                title:       movie.title,
                posterPath:  movie.poster_path,
                releaseDate: movie.release_date ?? null,
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

          {/* Spoiler-free overview */}
          <div className="mt-2 p-4 rounded-xl bg-ns-surface border border-ns-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-ns-gold" />
              <span className="text-ns-gold text-xs font-body tracking-widest uppercase">Spoiler-Free</span>
            </div>
            <p className="text-ns-text font-body text-sm leading-relaxed">{safeOverview}</p>
          </div>
        </div>
      </div>

      {/* Cast */}
      {topCast.length > 0 && (
        <div className="mb-10">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Cast</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {topCast.map(member => (
              <div key={member.id} className="flex-shrink-0 text-center w-[80px]">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-ns-surface border border-ns-border mx-auto mb-2">
                  <Image
                    src={tmdbImageUrl(member.profile_path, 'w185')}
                    alt={member.name}
                    width={80} height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-ns-text text-[11px] font-body leading-tight font-medium">{member.name}</p>
                <p className="text-ns-muted/60 text-[10px] font-body leading-tight truncate">{member.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vibe + Audience grid */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <MovieVibeProfile scores={vibe} />
        <WhoWouldEnjoy wouldEnjoy={audience.wouldEnjoy} mightNotEnjoy={audience.mightNotEnjoy} />
      </div>

      {/* Similar movies */}
      <SimilarMovies movies={similar.results ?? []} />

      {/* Community reviews */}
      <ReviewSection tmdbId={movie.id} movieTitle={movie.title} />

      {/* Spoiler Zone */}
      <SpoilerZone tmdbId={movie.id} movieTitle={movie.title} />
    </div>
  )
}
