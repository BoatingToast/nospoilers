import { prisma } from '@/lib/db'
import { logActivity } from './activity'
import { awardXP } from './xp'
import { checkAndUpdateAchievements } from './achievements'
import type { WatchlistItemData, WatchStatus } from '@/types'

// ─── Add / upsert ─────────────────────────────────────────────────────────────

export async function addToWatchlist(
  userId: string,
  movie: {
    tmdbId: number; title: string; posterPath: string | null
    releaseDate: string | null; genreIds: number[]
    runtime?: number | null; voteAverage?: number | null; matchScore?: number | null
  },
  status: WatchStatus = 'want_to_watch',
): Promise<WatchlistItemData> {
  const item = await prisma.watchlistItem.upsert({
    where:  { userId_tmdbId: { userId, tmdbId: movie.tmdbId } },
    create: {
      userId,
      tmdbId:      movie.tmdbId,
      title:       movie.title,
      posterPath:  movie.posterPath,
      releaseDate: movie.releaseDate,
      genreIds:    Array.isArray(movie.genreIds) ? movie.genreIds : [],
      runtime:     movie.runtime ?? null,
      voteAverage: movie.voteAverage ?? null,
      matchScore:  movie.matchScore ?? null,
      status,
    },
    update: { status },
  })

  await logActivity(userId, 'added_to_watchlist' as any, { movieTitle: movie.title, status })
  await awardXP(userId, 5, 'added_to_watchlist', { movieTitle: movie.title })
  await checkAndUpdateAchievements(userId, 'added_to_watchlist')

  return toData(item)
}

// ─── Update status / rating / notes ──────────────────────────────────────────

export async function updateWatchlistItem(
  userId: string,
  tmdbId: number,
  update: { status?: WatchStatus; rating?: number | null; notes?: string | null; rewatchCount?: number },
): Promise<WatchlistItemData> {
  // Read existing BEFORE writing, so we know whether status is actually changing
  const existing = update.status
    ? await prisma.watchlistItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } })
    : null

  const data: Record<string, unknown> = { ...update, updatedAt: new Date() }
  if (update.status === 'watched') data.watchedAt = new Date()

  // Write to DB first — achievement progress calculators query the DB,
  // so the row must already reflect the new status before we check.
  const item = await prisma.watchlistItem.update({
    where: { userId_tmdbId: { userId, tmdbId } },
    data,
  })

  // Now run side-effects that depend on the new DB state
  if (update.status === 'watched' && existing?.status !== 'watched') {
    await awardXP(userId, 25, 'watched_movie', { movieTitle: existing?.title ?? item.title })
    await checkAndUpdateAchievements(userId, 'watched_movie')
    await logActivity(userId, 'watched_movie' as any, { movieTitle: existing?.title ?? item.title, tmdbId })
  }

  return toData(item)
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeFromWatchlist(userId: string, tmdbId: number): Promise<void> {
  await prisma.watchlistItem.delete({ where: { userId_tmdbId: { userId, tmdbId } } })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getWatchlist(
  userId: string,
  opts: { status?: WatchStatus; sortBy?: string } = {},
): Promise<WatchlistItemData[]> {
  const where: Record<string, unknown> = { userId }
  if (opts.status) where.status = opts.status

  let orderBy: Record<string, string> = { addedAt: 'desc' }
  if (opts.sortBy === 'title')      orderBy = { title: 'asc' }
  if (opts.sortBy === 'year')       orderBy = { releaseDate: 'desc' }
  if (opts.sortBy === 'rating')     orderBy = { voteAverage: 'desc' }
  if (opts.sortBy === 'matchScore') orderBy = { matchScore: 'desc' }
  if (opts.sortBy === 'watchedAt')  orderBy = { watchedAt: 'desc' }

  const items = await prisma.watchlistItem.findMany({
    where,
    orderBy,
  })
  return items.map(toData)
}

export async function getWatchlistItem(userId: string, tmdbId: number) {
  return prisma.watchlistItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } })
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getWatchlistStats(userId: string) {
  const [total, watched, watching, wantToWatch] = await Promise.all([
    prisma.watchlistItem.count({ where: { userId } }),
    prisma.watchlistItem.count({ where: { userId, status: 'watched' } }),
    prisma.watchlistItem.count({ where: { userId, status: 'watching' } }),
    prisma.watchlistItem.count({ where: { userId, status: 'want_to_watch' } }),
  ])
  return { total, watched, watching, wantToWatch }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toData(item: {
  id: string; tmdbId: number; title: string; posterPath: string | null
  releaseDate: string | null; status: string; rating: number | null
  rewatchCount: number; notes: string | null; watchedAt: Date | null
  addedAt: Date; matchScore: number | null; voteAverage: number | null
  genreIds: number[]
}): WatchlistItemData {
  return {
    id:          item.id,
    tmdbId:      item.tmdbId,
    title:       item.title,
    posterPath:  item.posterPath,
    releaseDate: item.releaseDate,
    status:      item.status as WatchStatus,
    rating:      item.rating,
    rewatchCount: item.rewatchCount,
    notes:       item.notes,
    watchedAt:   item.watchedAt?.toISOString() ?? null,
    addedAt:     item.addedAt.toISOString(),
    matchScore:  item.matchScore,
    voteAverage: item.voteAverage,
    genreIds:    item.genreIds,
  }
}
