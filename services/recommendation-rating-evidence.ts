export interface LegacyRecommendationRatingRow {
  tmdbId: number
  title: string
  score: number
}

export interface RecommendationRatingRow extends LegacyRecommendationRatingRow {
  genreIds: number[]
}

/**
 * Prisma reports an unapplied column migration as P2022. Keep this check
 * dependency-free so the rollout behavior can be covered by node:test.
 */
export function isMissingColumnError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2022',
  )
}

/**
 * Rating genre evidence was added after the original ratings table shipped.
 * During a rolling deploy, the application can briefly be newer than the
 * database. Recommendations still have favorites, explicit genres, and Movie
 * DNA to work with, so gracefully omit rating-genre evidence until the schema
 * migration lands instead of blanking every shelf.
 */
export async function loadRecommendationRatingRows(
  loadWithEvidence: () => Promise<RecommendationRatingRow[]>,
  loadLegacyRows: () => Promise<LegacyRecommendationRatingRow[]>,
): Promise<RecommendationRatingRow[]> {
  try {
    const rows = await loadWithEvidence()
    return rows.map(row => ({ ...row, genreIds: row.genreIds ?? [] }))
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    const legacyRows = await loadLegacyRows()
    return legacyRows.map(row => ({ ...row, genreIds: [] }))
  }
}
