import { selectGuideMovies, utcDate, type MovieGuide } from '@/lib/movie-guides'
import { discoverMovies } from '@/services/tmdb'
import type { TMDbMovie } from '@/types'

/**
 * Guide pages are cached for a day. A failed or empty catalog response throws
 * so that Next keeps serving the last good page instead of caching an empty
 * list, which search engines would then index as a thin page.
 */
export async function getGuideMovies(guide: MovieGuide, now = new Date()): Promise<TMDbMovie[]> {
  const { results } = await discoverMovies(guide.query(utcDate(now)))
  const movies = selectGuideMovies(results ?? [], now)
  if (movies.length === 0) throw new Error(`TMDb returned no displayable movies for guide "${guide.slug}"`)
  return movies
}
