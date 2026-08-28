export interface RatedGenreEvidence {
  score: number
  genreIds: number[]
}

export interface GenreAffinity {
  /** Mean of the user's raw 1-100 ratings in this genre (for UI copy). */
  averageScore: number
  /** Rating-style-normalized preference signal, roughly -1.25 to 1.25. */
  signal: number
  count: number
}

export interface RatingAnchor {
  tmdbId: number
  title: string
  score: number
  genreIds: number[]
  affinity: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Rating-style normalization used by recommendation ranking. It intentionally
 * follows the same absolute/relative blend as Movie DNA, while staying in this
 * dependency-free module so its ranking behavior can run in node:test.
 */
function calculatePreferenceAffinities(scores: number[]): number[] {
  if (scores.length === 0) return []

  const bounded = scores.map(score => clamp(score, 1, 100))
  const mean = bounded.reduce((sum, score) => sum + score, 0) / bounded.length
  const variance = bounded.reduce((sum, score) => sum + (score - mean) ** 2, 0) / bounded.length
  const spread = Math.max(8, Math.sqrt(variance))
  const relativeShare = bounded.length < 3
    ? 0
    : Math.min(0.7, 0.15 + (bounded.length - 3) * 0.061)

  return bounded.map(score => {
    const absolute = clamp((score - 60) / 35, -1.25, 1.25)
    const relative = bounded.length < 3 ? 0 : clamp((score - mean) / spread, -1.25, 1.25)
    return clamp(absolute * (1 - relativeShare) + relative * relativeShare, -1.25, 1.25)
  })
}

/**
 * Build genre preferences from every rated movie that has cached TMDb genres.
 * The normalized signal matters here: a 75 from a harsh rater can be a much
 * stronger endorsement than a 75 from somebody whose average is in the 90s.
 */
export function buildGenreAffinities(ratings: RatedGenreEvidence[]): Map<number, GenreAffinity> {
  const affinities = calculatePreferenceAffinities(ratings.map(rating => rating.score))
  const totals = new Map<number, { scoreTotal: number; signalTotal: number; count: number }>()

  ratings.forEach((rating, index) => {
    const uniqueGenres = new Set((rating.genreIds ?? []).filter(Number.isInteger))
    for (const genreId of uniqueGenres) {
      const current = totals.get(genreId) ?? { scoreTotal: 0, signalTotal: 0, count: 0 }
      current.scoreTotal += rating.score
      current.signalTotal += affinities[index] ?? 0
      current.count += 1
      totals.set(genreId, current)
    }
  })

  return new Map(
    [...totals].map(([genreId, value]) => [genreId, {
      averageScore: value.scoreTotal / value.count,
      signal: value.signalTotal / value.count,
      count: value.count,
    }]),
  )
}

/**
 * Convert the user's genre history into a signed ranking adjustment. Positive
 * history can add up to 14 points; repeated low ratings can remove up to 16.
 * Sparse evidence is deliberately dampened so one rating cannot dominate.
 */
export function scoreGenreAffinity(
  genreIds: number[],
  affinities: Map<number, GenreAffinity>,
): { points: number; strongestPositive: [number, GenreAffinity] | null } {
  const matches = [...new Set(genreIds)]
    .map(genreId => [genreId, affinities.get(genreId)] as const)
    .filter((entry): entry is [number, GenreAffinity] => Boolean(entry[1]))

  if (matches.length === 0) return { points: 0, strongestPositive: null }

  let weightedSignal = 0
  let totalWeight = 0
  let observationCount = 0

  for (const [, affinity] of matches) {
    // More evidence earns more influence, but no broad genre gets to swamp all
    // other signals simply because it has many ratings.
    const weight = Math.min(3, Math.sqrt(affinity.count))
    weightedSignal += affinity.signal * weight
    totalWeight += weight
    observationCount += affinity.count
  }

  const meanSignal = totalWeight > 0 ? weightedSignal / totalWeight : 0
  const confidence = Math.min(1, Math.sqrt(observationCount) / 2)
  const points = Math.round(clamp(meanSignal * 12 * confidence, -16, 14) * 10) / 10

  const strongestPositive = matches
    .filter(([, affinity]) => affinity.signal > 0.15)
    .sort((a, b) => (b[1].signal * Math.sqrt(b[1].count)) - (a[1].signal * Math.sqrt(a[1].count)))[0]
    ?? null

  return { points, strongestPositive }
}

/** Select strong rating anchors using the user's own rating scale. */
export function selectPositiveRatingAnchors<T extends Omit<RatingAnchor, 'affinity'>>(
  ratings: T[],
  limit: number,
): Array<T & { affinity: number }> {
  const affinities = calculatePreferenceAffinities(ratings.map(rating => rating.score))

  return ratings
    .map((rating, index) => ({ ...rating, affinity: affinities[index] ?? 0 }))
    .filter(rating => rating.score >= 55 && rating.affinity >= 0.28)
    .sort((a, b) => b.affinity - a.affinity || b.score - a.score)
    .slice(0, limit)
}

function genreSimilarity(a: number[], b: number[]): number {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const genreId of left) if (right.has(genreId)) intersection += 1
  return intersection / new Set([...left, ...right]).size
}

/**
 * A light diversity rerank keeps the shelf from becoming eight near-identical
 * movies. It never changes the displayed score and only overrules close calls.
 */
export function pickDiverseRecommendations<
  T extends { tmdbId: number; matchScore: number; genreIds: number[] },
>(candidates: T[], limit: number): T[] {
  const remaining = [...candidates]
  const selected: T[] = []

  while (remaining.length > 0 && selected.length < limit) {
    let bestIndex = 0
    let bestAdjustedScore = -Infinity

    remaining.forEach((candidate, index) => {
      const closestGenreMatch = selected.reduce(
        (closest, chosen) => Math.max(closest, genreSimilarity(candidate.genreIds, chosen.genreIds)),
        0,
      )
      const repeatedLeadGenre = candidate.genreIds[0]
        ? selected.filter(chosen => chosen.genreIds[0] === candidate.genreIds[0]).length
        : 0
      const adjustedScore = candidate.matchScore - closestGenreMatch * 6 - repeatedLeadGenre * 1.5

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore && candidate.matchScore > remaining[bestIndex].matchScore)
      ) {
        bestAdjustedScore = adjustedScore
        bestIndex = index
      }
    })

    selected.push(remaining.splice(bestIndex, 1)[0])
  }

  return selected
}
