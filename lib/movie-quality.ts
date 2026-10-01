import type { TMDbMovie, TMDbMovieDetail } from '../types'

export interface MovieShelfOptions {
  limit?: number
  minVoteCount?: number
  maxVoteCount?: number
  minRating?: number
  minPopularity?: number
  maxPopularity?: number
  now?: Date
}

export interface RelatedMovieMatch {
  movie: TMDbMovie
  reason: string
}

interface RelatedCandidate {
  movie: TMDbMovie
  recommended: boolean
  similar: boolean
}

function hasValidReleaseDate(releaseDate: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return false
  const releaseTime = Date.parse(`${releaseDate}T00:00:00Z`)
  return Number.isFinite(releaseTime) && releaseTime <= now.getTime()
}

function isDisplayReadyMovie(movie: TMDbMovie, options: MovieShelfOptions): boolean {
  const now = options.now ?? new Date()

  return Boolean(
    Number.isInteger(movie.id)
    && movie.id > 0
    && movie.title?.trim()
    && movie.poster_path
    && hasValidReleaseDate(movie.release_date, now)
    && movie.vote_count >= (options.minVoteCount ?? 0)
    && movie.vote_count <= (options.maxVoteCount ?? Number.POSITIVE_INFINITY)
    && movie.vote_average >= (options.minRating ?? 0)
    && movie.popularity >= (options.minPopularity ?? 0)
    && movie.popularity <= (options.maxPopularity ?? Number.POSITIVE_INFINITY)
  )
}

/**
 * Selects a display-ready shelf while reserving accepted IDs globally.
 * Reusing the same `seenIds` set across shelves prevents the Discover page
 * from presenting one popular title in several differently-labelled rows.
 */
export function curateDistinctMovieShelf(
  movies: TMDbMovie[],
  seenIds: Set<number>,
  options: MovieShelfOptions = {},
): TMDbMovie[] {
  const selected: TMDbMovie[] = []
  const limit = Math.max(0, options.limit ?? 10)

  for (const movie of movies) {
    if (selected.length >= limit) break
    if (seenIds.has(movie.id) || !isDisplayReadyMovie(movie, options)) continue

    seenIds.add(movie.id)
    selected.push(movie)
  }

  return selected
}

function genreIds(movie: TMDbMovie): number[] {
  return Array.isArray(movie.genre_ids) ? movie.genre_ids : []
}

function relatedReason(
  source: TMDbMovieDetail,
  candidate: RelatedCandidate,
  sharedGenreIds: number[],
): string {
  const genreNames = new Map(source.genres.map(genre => [genre.id, genre.name]))
  const sharedNames = sharedGenreIds
    .map(id => genreNames.get(id))
    .filter((name): name is string => Boolean(name))
    .slice(0, 2)

  if (sharedNames.length > 0) {
    const signal = candidate.recommended
      ? 'TMDb recommendation'
      : 'Similar-film signal'
    return `${signal} · shares ${sharedNames.join(' + ')}`
  }

  return candidate.recommended
    ? 'TMDb audience recommendation'
    : 'TMDb similar-film signal'
}

/**
 * Blends TMDb's recommendation and similar-film feeds, then applies a common
 * relevance and quality floor. A shared genre is required so a noisy upstream
 * result cannot outrank a genuinely related film on popularity alone.
 */
export function selectRelatedMovies(
  source: TMDbMovieDetail,
  recommendations: TMDbMovie[],
  similar: TMDbMovie[],
  options: { limit?: number; now?: Date } = {},
): RelatedMovieMatch[] {
  const candidates = new Map<number, RelatedCandidate>()

  for (const [movies, sourceType] of [
    [recommendations, 'recommended'],
    [similar, 'similar'],
  ] as const) {
    for (const movie of movies) {
      if (movie.id === source.id) continue
      const existing = candidates.get(movie.id)
      candidates.set(movie.id, {
        movie,
        recommended: existing?.recommended || sourceType === 'recommended',
        similar: existing?.similar || sourceType === 'similar',
      })
    }
  }

  const sourceGenreIds = new Set(source.genres.map(genre => genre.id))
  const sourceYear = Number.parseInt(source.release_date?.slice(0, 4), 10)

  return [...candidates.values()]
    .filter(candidate => isDisplayReadyMovie(candidate.movie, {
      minVoteCount: 75,
      minRating: 5.5,
      now: options.now,
    }))
    .map(candidate => {
      const sharedGenreIds = genreIds(candidate.movie).filter(id => sourceGenreIds.has(id))
      const candidateYear = Number.parseInt(candidate.movie.release_date.slice(0, 4), 10)
      const yearDistance = Number.isFinite(sourceYear) && Number.isFinite(candidateYear)
        ? Math.abs(sourceYear - candidateYear)
        : 50
      const voteConfidence = Math.min(Math.log10(Math.max(candidate.movie.vote_count, 1)), 4)
      const languageMatch = candidate.movie.original_language === source.original_language ? 1 : 0
      const score = (candidate.recommended ? 22 : 0)
        + (candidate.similar ? 8 : 0)
        + sharedGenreIds.length * 14
        + candidate.movie.vote_average * 1.6
        + voteConfidence * 3
        + languageMatch * 2
        + Math.max(0, 4 - yearDistance / 8)

      return { candidate, sharedGenreIds, score }
    })
    .filter(ranked => ranked.sharedGenreIds.length > 0)
    .sort((a, b) => b.score - a.score || b.candidate.movie.vote_count - a.candidate.movie.vote_count)
    .slice(0, Math.max(0, options.limit ?? 10))
    .map(({ candidate, sharedGenreIds }) => ({
      movie: candidate.movie,
      reason: relatedReason(source, candidate, sharedGenreIds),
    }))
}
