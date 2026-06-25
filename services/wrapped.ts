import { prisma } from '@/lib/db'
import type { WrappedData, DNAScores } from '@/types'
import { getPersonalityBySlug } from './personality'

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

export async function generateWrapped(userId: string, year: number = new Date().getFullYear()): Promise<WrappedData> {
  const yearStart = new Date(`${year}-01-01T00:00:00Z`)
  const yearEnd   = new Date(`${year}-12-31T23:59:59Z`)

  const [
    watchedMovies,
    tasteProfile,
    personality,
    achievements,
    activityEvents,
    followers,
  ] = await Promise.all([
    prisma.watchlistItem.findMany({
      where:   { userId, status: 'watched', watchedAt: { gte: yearStart, lte: yearEnd } },
      orderBy: { watchedAt: 'asc' },
    }),
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.userPersonality.findUnique({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId, earned: true } }),
    prisma.activityEvent.findMany({
      where:   { userId, createdAt: { gte: yearStart, lte: yearEnd } },
      select:  { type: true },
    }),
    prisma.userFollow.count({ where: { followingId: userId, createdAt: { gte: yearStart, lte: yearEnd } } }),
  ])

  // If no watches this year, fall back to onboarding movies for the "top movies" section
  const onboardingMovies = watchedMovies.length === 0
    ? await prisma.onboardingMovie.findMany({ where: { userId }, take: 5 })
    : []

  // Genre frequency from watched movies
  const genreFreq: Record<number, number> = {}
  for (const m of watchedMovies) {
    for (const g of (m.genreIds ?? [])) genreFreq[g] = (genreFreq[g] ?? 0) + 1
  }
  const topGenres = Object.entries(genreFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => GENRE_NAMES[parseInt(id)] ?? 'Other')

  // Decade analysis
  const decades: Record<string, number> = {}
  for (const m of watchedMovies) {
    if (m.releaseDate) {
      const year = parseInt(m.releaseDate.slice(0, 4), 10)
      const decade = `${Math.floor(year / 10) * 10}s`
      decades[decade] = (decades[decade] ?? 0) + 1
    }
  }
  const topDecade = Object.entries(decades).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  // Top trait from DNA
  let topTrait: string | null = null
  if (tasteProfile) {
    const scores: Record<string, number> = {
      'Suspense':        tasteProfile.suspenseScore,
      'Emotional Depth': tasteProfile.emotionalImpactScore,
      'Complexity':      tasteProfile.complexityScore,
      'Humor':           tasteProfile.humorScore,
      'Realism':         tasteProfile.realismScore,
      'Action':          tasteProfile.actionScore,
      'Darkness':        tasteProfile.darknessScore,
    }
    topTrait = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
  }

  // Hidden gems found = low popularity + in watchlist
  const hiddenGemsFound = watchedMovies.filter(m => m.voteAverage !== null && (m.voteAverage ?? 0) >= 7).length

  // Top movies (watched this year, or fallback to onboarding)
  const topMovies = watchedMovies.length > 0
    ? watchedMovies.slice(-5).reverse().map(m => ({ tmdbId: m.tmdbId, title: m.title, posterPath: m.posterPath }))
    : onboardingMovies.map(m => ({ tmdbId: m.tmdbId, title: m.title, posterPath: m.posterPath }))

  const dnaSnapshot: DNAScores | null = tasteProfile ? {
    suspenseScore:        tasteProfile.suspenseScore,
    emotionalImpactScore: tasteProfile.emotionalImpactScore,
    complexityScore:      tasteProfile.complexityScore,
    humorScore:           tasteProfile.humorScore,
    realismScore:         tasteProfile.realismScore,
    actionScore:          tasteProfile.actionScore,
    darknessScore:        tasteProfile.darknessScore,
  } : null

  const personalityName = personality
    ? getPersonalityBySlug(personality.primaryType)?.name ?? null
    : null

  const data: WrappedData = {
    year,
    moviesWatched:      watchedMovies.length,
    topGenres:          topGenres.length > 0 ? topGenres : (await prisma.userPreferences.findUnique({ where: { userId }, select: { genres: true } }))?.genres?.slice(0, 3) ?? [],
    topMovies,
    totalWatchTime:     watchedMovies.reduce((sum, m) => sum + (m.runtime ?? 0), 0) || null,
    topDecade,
    personalityType:    personalityName,
    topTrait,
    achievementsEarned: achievements,
    hiddenGemsFound,
    followersGained:    followers,
    dnaSnapshot,
    generatedAt:        new Date().toISOString(),
  }

  // Persist
  await prisma.wrappedStats.upsert({
    where:  { userId_year: { userId, year } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { userId, year, data: data as any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { data: data as any, updatedAt: new Date() },
  }).catch(() => {})

  return data
}
