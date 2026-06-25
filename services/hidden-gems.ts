import { getHiddenGems, getMoviesByGenre } from './tmdb'
import { prisma } from '@/lib/db'

const GENRE_ID_MAP: Record<string, number> = {
  drama: 18, thriller: 53, 'sci-fi': 878, horror: 27,
  comedy: 35, action: 28, crime: 80, mystery: 9648,
  documentary: 99, romance: 10749,
}

export async function getHiddenGemsForUser(userId: string, limit = 8) {
  const [prefs, knownIds] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId }, select: { genres: true } }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true } })
      .then(items => new Set(items.map(i => i.tmdbId))),
  ])

  const [onboardingIds, recIds] = await Promise.all([
    prisma.onboardingMovie.findMany({ where: { userId }, select: { tmdbId: true } }).then(m => m.map(x => x.tmdbId)),
    prisma.recommendation.findMany({ where: { userId }, select: { tmdbId: true } }).then(m => m.map(x => x.tmdbId)),
  ])
  const excludeIds = new Set([...knownIds, ...onboardingIds, ...recIds])

  let gems = await getHiddenGems().then(r => r.results).catch(() => [])

  if ((prefs?.genres ?? []).length > 0) {
    const topGenre = prefs!.genres[0]
    const genreId  = GENRE_ID_MAP[topGenre.toLowerCase()]
    if (genreId) {
      const genreMovies = await getMoviesByGenre(genreId).then(r => r.results).catch(() => [])
      const lowPop = genreMovies.filter(m => m.popularity < 40 && m.vote_average >= 7)
      gems = [...gems, ...lowPop]
    }
  }

  const seen = new Set<number>()
  return gems
    .filter(m => !excludeIds.has(m.id) && !seen.has(m.id) && (seen.add(m.id), true))
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, limit)
}
