import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'
import { guidePath, MOVIE_GUIDES } from '@/lib/movie-guides'
import { getGuideMovies } from '@/services/movie-guides'
import { getTrendingMovies, getPopularMovies, getTopRatedMovies, getNowPlaying } from '@/services/tmdb'
import type { TMDbMovie } from '@/types'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    '/', '/discover', '/movie-recommendations', '/pro', '/theater', '/privacy/extension',
    ...MOVIE_GUIDES.map(guidePath),
  ].map(path => ({ url: absoluteUrl(path) }))

  // These public catalogs also feed the homepage and Discover. A failed feed
  // must not prevent discovery of the static pages or the other movie feeds.
  const catalogs = await Promise.allSettled<TMDbMovie[]>([
    ...[getTrendingMovies('week'), getPopularMovies(), getTopRatedMovies(), getNowPlaying()]
      .map(feed => feed.then(response => response.results)),
    // Same cached requests as the guide pages, so this adds no TMDb traffic.
    ...MOVIE_GUIDES.map(guide => getGuideMovies(guide)),
  ])
  const ids = new Set<number>()
  for (const catalog of catalogs) {
    if (catalog.status !== 'fulfilled') continue
    for (const movie of catalog.value) {
      if (!movie.adult && Number.isSafeInteger(movie.id) && movie.id > 0) ids.add(movie.id)
    }
  }

  // TMDb does not provide content modification dates here. Do not invent them.
  return [...pages, ...[...ids].sort((a, b) => a - b).map(id => ({ url: absoluteUrl(`/movie/${id}`) }))]
}
