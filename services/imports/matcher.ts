import { findMovieByImdbId, getMovieById, searchMovies } from '@/services/tmdb'
import type { TMDbMovie, TMDbMovieDetail } from '@/types'
import type { ImportMovieCandidate, ParsedTasteItem, TasteImportPreviewItem } from './types'

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function yearOf(value: string | null | undefined): number | null {
  const year = Number(String(value ?? '').slice(0, 4))
  return Number.isInteger(year) && year > 1800 ? year : null
}

function fromSearchMovie(movie: TMDbMovie): ImportMovieCandidate {
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: yearOf(movie.release_date),
    posterPath: movie.poster_path ?? null,
    releaseDate: movie.release_date || null,
    genreIds: movie.genre_ids ?? [],
    runtime: null,
    voteAverage: movie.vote_average ?? null,
  }
}

function fromDetail(movie: TMDbMovieDetail): ImportMovieCandidate {
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: yearOf(movie.release_date),
    posterPath: movie.poster_path ?? null,
    releaseDate: movie.release_date || null,
    genreIds: movie.genres?.map(genre => genre.id) ?? movie.genre_ids ?? [],
    runtime: movie.runtime ?? null,
    voteAverage: movie.vote_average ?? null,
  }
}

async function candidateForDirectId(item: ParsedTasteItem): Promise<ImportMovieCandidate | null> {
  if (item.tmdbId) {
    const movie = await getMovieById(item.tmdbId).catch(() => null)
    if (movie) return fromDetail(movie)
  }
  if (item.imdbId) {
    const movie = await findMovieByImdbId(item.imdbId).catch(() => null)
    if (movie) return fromSearchMovie(movie)
  }
  return null
}

async function matchOne(item: ParsedTasteItem): Promise<TasteImportPreviewItem> {
  const direct = await candidateForDirectId(item)
  if (direct) {
    return {
      ...item,
      status: 'matched',
      confidence: 'exact',
      candidates: [direct],
      selectedTmdbId: direct.tmdbId,
      existing: { rating: false, watchlist: false },
    }
  }

  const response = await searchMovies(item.title).catch(() => ({ results: [] as TMDbMovie[] }))
  const wantedTitle = normalizeTitle(item.title)
  const ranked = (response.results ?? [])
    .map(movie => {
      const exactTitle = normalizeTitle(movie.title) === wantedTitle
      const movieYear = yearOf(movie.release_date)
      const exactYear = item.year !== null && movieYear === item.year
      const score = (exactTitle ? 10 : 0) + (exactYear ? 5 : 0) + (movie.popularity ?? 0) / 1000
      return { movie, exactTitle, exactYear, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  if (ranked.length === 0) {
    return {
      ...item,
      status: 'unmatched',
      confidence: 'none',
      candidates: [],
      selectedTmdbId: null,
      existing: { rating: false, watchlist: false },
    }
  }

  const best = ranked[0]
  const exact = best.exactTitle && (item.year === null || best.exactYear)
  const candidates = ranked.map(result => fromSearchMovie(result.movie))
  return {
    ...item,
    status: exact ? 'matched' : 'conflict',
    confidence: exact ? 'exact' : 'likely',
    candidates,
    selectedTmdbId: exact ? candidates[0].tmdbId : null,
    existing: { rating: false, watchlist: false },
  }
}

export async function matchTasteItems(items: ParsedTasteItem[], concurrency = 8): Promise<TasteImportPreviewItem[]> {
  const results = new Array<TasteImportPreviewItem>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await matchOne(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}
