import type {
  TMDbMovie,
  TMDbMovieDetail,
  TMDbCredits,
  TMDbSearchResponse,
  TMDbMultiSearchResponse,
  TMDbWatchProvidersResponse,
  TMDbPersonDetail,
  TMDbPersonMovieCredits,
  TMDbVideosResponse,
} from '@/types'
import type {
  MovieWatchAccessType,
  MovieWatchAvailability,
  MovieWatchProvider,
} from '@/lib/movie-uploads'
import { selectAutomaticMovieMatch } from '@/lib/movie-matching'

// The override keeps browser tests hermetic by pointing them at a local TMDb
// fixture server. Production continues to use TMDb unless explicitly configured.
const BASE_URL = process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3'

const PLACEHOLDER_TOKEN  = 'your-tmdb-read-access-token'
const PLACEHOLDER_APIKEY = 'your-tmdb-api-key'

function getRealToken(): string | null {
  const t = process.env.TMDB_ACCESS_TOKEN
  return t && t !== PLACEHOLDER_TOKEN ? t : null
}

function getRealApiKey(): string | null {
  const k = process.env.TMDB_API_KEY
  return k && k !== PLACEHOLDER_APIKEY ? k : null
}

function getHeaders(): HeadersInit {
  const token = getRealToken()
  if (token) return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  return { 'Content-Type': 'application/json' }
}

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const url    = new URL(`${BASE_URL}${path}`)
  const token  = getRealToken()
  const apiKey = getRealApiKey()

  // Only append api_key when using key-based auth (no Bearer token)
  if (!token && apiKey) params.api_key = apiKey

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

function assertCredentials() {
  if (!getRealToken() && !getRealApiKey()) {
    throw new Error(
      'TMDb credentials missing. Add TMDB_ACCESS_TOKEN or TMDB_API_KEY to your .env file. ' +
      'Get a free key at https://www.themoviedb.org/settings/api'
    )
  }
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate = 3600
): Promise<T> {
  assertCredentials()

  const res = await fetch(buildUrl(path, params), {
    headers: getHeaders(),
    next: { revalidate },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`TMDb ${res.status} on ${path}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchMovies(query: string, page = 1): Promise<TMDbSearchResponse> {
  return tmdbFetch('/search/movie', { query, page: String(page), include_adult: 'false' })
}

export async function findAutomaticMovieMatch(title: string, releaseYear: number | null) {
  const search = await searchMovies(title)
  return selectAutomaticMovieMatch(title, releaseYear, search.results)
}

export async function findMovieByImdbId(imdbId: string): Promise<TMDbMovie | null> {
  const data = await tmdbFetch<{ movie_results?: TMDbMovie[] }>(
    `/find/${encodeURIComponent(imdbId)}`,
    { external_source: 'imdb_id' },
    86400,
  )
  return data.movie_results?.[0] ?? null
}

export async function searchMulti(query: string): Promise<TMDbMultiSearchResponse> {
  return tmdbFetch('/search/multi', { query, include_adult: 'false' }, 60)
}

// ─── People ──────────────────────────────────────────────────────────────────

export async function getPersonById(id: number): Promise<TMDbPersonDetail> {
  return tmdbFetch(`/person/${id}`, {}, 86400)
}

export async function getPersonMovieCredits(id: number): Promise<TMDbPersonMovieCredits> {
  return tmdbFetch(`/person/${id}/movie_credits`, {}, 86400)
}

// ─── Movie detail ─────────────────────────────────────────────────────────────

export async function getMovieById(id: number): Promise<TMDbMovieDetail> {
  return tmdbFetch(`/movie/${id}`)
}

export async function getMovieCredits(id: number): Promise<TMDbCredits> {
  return tmdbFetch(`/movie/${id}/credits`)
}

export async function getMovieVideos(id: number): Promise<TMDbVideosResponse> {
  return tmdbFetch(`/movie/${id}/videos`, {}, 21600)
}

export async function getMovieSimilar(id: number): Promise<TMDbSearchResponse> {
  return tmdbFetch(`/movie/${id}/similar`)
}

export async function getMovieKeywords(id: number): Promise<string[]> {
  try {
    const data = await tmdbFetch<{ keywords: { id: number; name: string }[] }>(
      `/movie/${id}/keywords`,
      {},
      86400, // cache for 24 h — keywords rarely change
    )
    return (data.keywords ?? []).map(k => k.name.toLowerCase())
  } catch {
    return []
  }
}

export async function getMovieRecommendations(id: number): Promise<TMDbSearchResponse> {
  return tmdbFetch(`/movie/${id}/recommendations`)
}

export async function getMovieWatchProviders(
  id: number,
  region = 'US',
): Promise<MovieWatchAvailability | null> {
  const data = await tmdbFetch<TMDbWatchProvidersResponse>(
    `/movie/${id}/watch/providers`,
    {},
    21600,
  )
  const regionCode = region.toUpperCase()
  const availability = data.results?.[regionCode]
  if (!availability) return null

  const providerMap = new Map<number, MovieWatchProvider & { displayPriority: number }>()
  const groups: Array<[
    keyof Pick<typeof availability, 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'>,
    MovieWatchAccessType,
  ]> = [
    ['flatrate', 'stream'],
    ['free', 'free'],
    ['ads', 'ads'],
    ['rent', 'rent'],
    ['buy', 'buy'],
  ]

  for (const [key, accessType] of groups) {
    for (const provider of availability[key] ?? []) {
      const existing = providerMap.get(provider.provider_id)
      if (existing) {
        if (!existing.accessTypes?.includes(accessType)) existing.accessTypes?.push(accessType)
        continue
      }

      providerMap.set(provider.provider_id, {
        name: provider.provider_name,
        url: availability.link,
        source: 'tmdb',
        providerId: provider.provider_id,
        logoPath: provider.logo_path,
        accessTypes: [accessType],
        displayPriority: provider.display_priority,
      })
    }
  }

  const providers = [...providerMap.values()]
    .sort((a, b) => a.displayPriority - b.displayPriority)
    .map(({ displayPriority: _displayPriority, ...provider }) => provider)

  return { region: regionCode, link: availability.link, providers }
}

// ─── Discovery ───────────────────────────────────────────────────────────────

export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDbSearchResponse> {
  return tmdbFetch(`/trending/movie/${timeWindow}`)
}

export async function getPopularMovies(page = 1): Promise<TMDbSearchResponse> {
  return tmdbFetch('/movie/popular', { page: String(page) })
}

export async function getTopRatedMovies(page = 1): Promise<TMDbSearchResponse> {
  return tmdbFetch('/movie/top_rated', { page: String(page) })
}

export async function getNowPlaying(): Promise<TMDbSearchResponse> {
  return tmdbFetch('/movie/now_playing')
}

export async function getMoviesByGenre(
  genreId: number,
  page = 1
): Promise<TMDbSearchResponse> {
  return tmdbFetch('/discover/movie', {
    with_genres:  String(genreId),
    sort_by:      'popularity.desc',
    page:         String(page),
    include_adult: 'false',
    'vote_count.gte': '100',
  })
}

export async function getHiddenGems(): Promise<TMDbSearchResponse> {
  return tmdbFetch('/discover/movie', {
    sort_by:              'vote_average.desc',
    'vote_average.gte':   '7.5',
    'vote_count.gte':     '200',
    'popularity.lte':     '40',
    include_adult:        'false',
  })
}

export type { TMDbMovie, TMDbMovieDetail, TMDbCredits, TMDbSearchResponse }
