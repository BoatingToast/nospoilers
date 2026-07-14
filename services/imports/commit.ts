import { prisma } from '@/lib/db'
import { recalcTasteProfile } from '@/services/ratings'
import { generateRecommendations } from '@/services/recommendations'
import type { ImportMovieCandidate, TasteImportPayload, TasteImportPreviewItem } from './types'

interface ImportSelection {
  rowKey: string
  tmdbId: number
}

function safeDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function chosenMovie(item: TasteImportPreviewItem, tmdbId: number): ImportMovieCandidate | null {
  return item.candidates.find(candidate => candidate.tmdbId === tmdbId) ?? null
}

export async function commitTasteImport(userId: string, batchId: string, selections: ImportSelection[]) {
  const batch = await prisma.importBatch.findFirst({ where: { id: batchId, userId } })
  if (!batch) throw new Error('Import preview not found.')
  if (batch.status !== 'previewed') throw new Error('This import has already been completed.')

  const payload = batch.payload as unknown as TasteImportPayload | null
  if (!payload || payload.version !== 1 || !Array.isArray(payload.items)) throw new Error('Import preview has expired.')

  const requested = new Map(selections.map(selection => [selection.rowKey, selection.tmdbId]))
  const selected = payload.items.flatMap(item => {
    const tmdbId = requested.get(item.rowKey)
    if (!tmdbId) return []
    const movie = chosenMovie(item, tmdbId)
    return movie ? [{ item, movie }] : []
  })
  if (selected.length === 0) throw new Error('Select at least one matched movie to import.')

  const ids = selected.map(entry => entry.movie.tmdbId)
  const [existingWatchlist, existingRatings] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId, tmdbId: { in: ids } } }),
    prisma.movieRating.findMany({ where: { userId, tmdbId: { in: ids } } }),
  ])
  const watchlistById = new Map(existingWatchlist.map(item => [item.tmdbId, item]))
  const ratingById = new Map(existingRatings.map(item => [item.tmdbId, item]))

  let ratings = 0
  let watched = 0
  let watchlist = 0
  let reviews = 0

  await prisma.$transaction(async tx => {
    for (const { item, movie } of selected) {
      const currentWatch = watchlistById.get(movie.tmdbId)
      const currentRating = ratingById.get(movie.tmdbId)
      const shouldBeWatched = item.watched || currentWatch?.status === 'watched'
      const importedWatchedAt = safeDate(item.watchedDate)
      const status = shouldBeWatched ? 'watched' : 'want_to_watch'
      const preserveReviewAsNote = item.review && item.ratingScore === null ? item.review : null

      if (item.watched || item.watchlist || item.ratingScore !== null || item.review) {
        await tx.watchlistItem.upsert({
          where: { userId_tmdbId: { userId, tmdbId: movie.tmdbId } },
          create: {
            userId,
            tmdbId: movie.tmdbId,
            title: movie.title,
            posterPath: movie.posterPath,
            releaseDate: movie.releaseDate,
            genreIds: movie.genreIds,
            runtime: movie.runtime,
            voteAverage: movie.voteAverage,
            status,
            rating: item.ratingScore === null ? null : Math.max(1, Math.round(item.ratingScore / 10)),
            rewatchCount: item.rewatch ? 1 : 0,
            notes: preserveReviewAsNote,
            watchedAt: shouldBeWatched ? importedWatchedAt ?? new Date() : null,
            progressPercent: shouldBeWatched ? 100 : 0,
            passportUpdatedAt: new Date(),
            addedAt: importedWatchedAt ?? new Date(),
          },
          update: {
            title: movie.title,
            posterPath: movie.posterPath,
            releaseDate: movie.releaseDate,
            genreIds: movie.genreIds,
            runtime: movie.runtime,
            voteAverage: movie.voteAverage,
            status,
            rating: item.ratingScore === null ? currentWatch?.rating ?? null : Math.max(1, Math.round(item.ratingScore / 10)),
            rewatchCount: Math.max(currentWatch?.rewatchCount ?? 0, item.rewatch ? 1 : 0),
            notes: preserveReviewAsNote ?? currentWatch?.notes ?? null,
            watchedAt: shouldBeWatched ? importedWatchedAt ?? currentWatch?.watchedAt ?? new Date() : null,
            progressPercent: shouldBeWatched ? 100 : currentWatch?.progressPercent ?? 0,
            passportUpdatedAt: new Date(),
          },
        })
      }

      if (item.ratingScore !== null) {
        await tx.movieRating.upsert({
          where: { userId_tmdbId: { userId, tmdbId: movie.tmdbId } },
          create: {
            userId,
            tmdbId: movie.tmdbId,
            title: movie.title,
            posterPath: movie.posterPath,
            releaseDate: movie.releaseDate,
            score: item.ratingScore,
            review: item.review,
            createdAt: importedWatchedAt ?? new Date(),
          },
          update: {
            title: movie.title,
            posterPath: movie.posterPath,
            releaseDate: movie.releaseDate,
            score: item.ratingScore,
            review: item.review ?? currentRating?.review ?? null,
            updatedAt: new Date(),
          },
        })
        ratings += 1
      }
      if (item.watched) watched += 1
      if (item.watchlist && !item.watched) watchlist += 1
      if (item.review) reviews += 1
    }

    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        summary: { imported: selected.length, ratings, watched, watchlist, reviews },
        payload: { ...payload, committedSelections: selections } as any,
      },
    })
  })

  let refreshWarning: string | null = null
  try {
    await recalcTasteProfile(userId)
    await generateRecommendations(userId)
  } catch (error) {
    console.error('[taste-import/rebuild]', error)
    refreshWarning = 'Your movies were imported, but recommendations will refresh the next time you open them.'
  }

  const suggestedFavorites = selected
    .sort((a, b) => (b.item.ratingScore ?? 0) - (a.item.ratingScore ?? 0))
    .slice(0, 10)
    .map(({ movie }) => ({
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseDate: movie.releaseDate,
      genreIds: movie.genreIds,
    }))

  return {
    summary: { imported: selected.length, ratings, watched, watchlist, reviews },
    suggestedFavorites,
    warning: refreshWarning,
  }
}
