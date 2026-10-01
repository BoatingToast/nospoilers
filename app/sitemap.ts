import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'
import { getTrendingMovies, getPopularMovies, getTopRatedMovies, getNowPlaying } from '@/services/tmdb'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    '/', '/discover', '/movie-recommendations', '/pro', '/theater', '/privacy/extension',
  ].map(path => ({ url: absoluteUrl(path) }))

  // These public catalogs also feed the homepage and Discover. A failed feed
  // must not prevent discovery of the static pages or the other movie feeds.
  const catalogs = await Promise.allSettled([
    getTrendingMovies('week'), getPopularMovies(), getTopRatedMovies(), getNowPlaying(),
  ])
  const ids = new Set<number>()
  for (const catalog of catalogs) {
    if (catalog.status !== 'fulfilled') continue
    for (const movie of catalog.value.results) {
      if (!movie.adult && Number.isSafeInteger(movie.id) && movie.id > 0) ids.add(movie.id)
    }
  }

  // TMDb does not provide content modification dates here. Do not invent them.
  return [...pages, ...[...ids].sort((a, b) => a - b).map(id => ({ url: absoluteUrl(`/movie/${id}`) }))]
}
