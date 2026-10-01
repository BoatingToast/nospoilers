import { prisma } from '@/lib/db'
import {
  buildProTasteReport,
  type ProQueueMovie,
  type ProTasteReport,
} from '@/lib/pro-features'

export interface ProPreviewData {
  queue: ProQueueMovie[]
  queueStats: {
    count: number
    knownRuntimeCount: number
    knownRuntimeMinutes: number
    oldestTitle: string | null
  }
  passport: {
    protected: number
    inProgress: number
    cleared: number
  }
  taste: ProTasteReport
}

export async function getProPreviewData(userId: string): Promise<ProPreviewData> {
  const [watchlist, ratings, preferences] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'asc' },
      select: {
        tmdbId: true,
        title: true,
        posterPath: true,
        releaseDate: true,
        genreIds: true,
        runtime: true,
        voteAverage: true,
        matchScore: true,
        status: true,
        progressPercent: true,
        addedAt: true,
      },
    }),
    prisma.movieRating.findMany({
      where: { userId },
      select: {
        score: true,
        genreIds: true,
        storytelling: true,
        characters: true,
        entertainment: true,
        emotion: true,
        complexity: true,
        suspense: true,
      },
    }),
    prisma.userPreferences.findUnique({
      where: { userId },
      select: { genres: true },
    }),
  ])

  const queue = watchlist
    .filter(movie => movie.status === 'want_to_watch')
    .map(movie => ({
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
      genreIds: movie.genreIds,
      runtime: movie.runtime,
      voteAverage: movie.voteAverage,
      matchScore: movie.matchScore,
      addedAt: movie.addedAt.toISOString(),
    }))
  const knownRuntimes = queue
    .map(movie => movie.runtime)
    .filter((runtime): runtime is number => runtime !== null)

  return {
    queue,
    queueStats: {
      count: queue.length,
      knownRuntimeCount: knownRuntimes.length,
      knownRuntimeMinutes: knownRuntimes.reduce((sum, runtime) => sum + runtime, 0),
      oldestTitle: queue[0]?.title ?? null,
    },
    passport: {
      protected: watchlist.filter(movie => movie.progressPercent < 100).length,
      inProgress: watchlist.filter(movie => movie.progressPercent > 0 && movie.progressPercent < 100).length,
      cleared: watchlist.filter(movie => movie.progressPercent === 100).length,
    },
    taste: buildProTasteReport(ratings, preferences?.genres ?? []),
  }
}
