import type {
  TMDbMovie,
  TMDbMovieDetail,
  TMDbCredits,
  TMDbSearchResponse,
  TMDbMultiSearchResponse,
} from '@/types'

const BASE_URL = 'https://api.themoviedb.org/3'

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

export async function searchMulti(query: string): Promise<TMDbMultiSearchResponse> {
  return tmdbFetch('/search/multi', { query, include_adult: 'false' }, 60)
}

// ─── Movie detail ─────────────────────────────────────────────────────────────

export async function getMovieById(id: number): Promise<TMDbMovieDetail> {
  return tmdbFetch(`/movie/${id}`)
}

export async function getMovieCredits(id: number): Promise<TMDbCredits> {
  return tmdbFetch(`/movie/${id}/credits`)
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
