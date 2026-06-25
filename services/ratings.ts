import { prisma } from '@/lib/db'
import { logActivity } from './activity'
import type { MovieRatingData, RatingStats, DNAScores } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpsertRatingInput {
  tmdbId:        number
  title:         string
  posterPath:    string | null
  releaseDate:   string | null
  /** Overall score 1–100. Always the user's explicit choice — never derived from dimensions. */
  score:         number
  /** Dimension metadata 1–10 — descriptive only, never affect score. */
  storytelling?: number | null
  characters?:   number | null
  entertainment?:number | null
  emotion?:      number | null
  complexity?:   number | null
  suspense?:     number | null
  review?:       string | null
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function upsertRating(
  userId: string,
  input: UpsertRatingInput,
): Promise<MovieRatingData> {
  const data = {
    userId,
    tmdbId:        input.tmdbId,
    title:         input.title,
    posterPath:    input.posterPath,
    releaseDate:   input.releaseDate,
    score:         Math.min(100, Math.max(1, Math.round(input.score))),
    storytelling:  input.storytelling  ?? null,
    characters:    input.characters    ?? null,
    entertainment: input.entertainment ?? null,
    emotion:       input.emotion       ?? null,
    complexity:    input.complexity    ?? null,
    suspense:      input.suspense      ?? null,
    review:        input.review        ?? null,
  }

  const rating = await prisma.movieRating.upsert({
    where:  { userId_tmdbId: { userId, tmdbId: input.tmdbId } },
    create: data,
    update: { ...data, updatedAt: new Date() },
  })

  // Re-derive the user's taste profile from all their ratings
  void recalcTasteProfile(userId).catch(() => {})
  // Log for friends feed
  void logActivity(userId, 'rated_movie', {
    tmdbId:     input.tmdbId,
    movieTitle: input.title,
    score:      data.score,
  }).catch(() => {})

  return toData(rating)
}

export async function deleteRating(userId: string, tmdbId: number): Promise<void> {
  await prisma.movieRating.delete({
    where: { userId_tmdbId: { userId, tmdbId } },
  }).catch(() => {}) // swallow if not found

  void recalcTasteProfile(userId).catch(() => {})
}

export async function getRating(
  userId: string,
  tmdbId: number,
): Promise<MovieRatingData | null> {
  const r = await prisma.movieRating.findUnique({
    where: { userId_tmdbId: { userId, tmdbId } },
  })
  return r ? toData(r) : null
}

export async function getUserRatings(
  userId: string,
  opts: { page?: number; limit?: number; sortBy?: 'score' | 'date' } = {},
): Promise<{ items: MovieRatingData[]; total: number; hasMore: boolean }> {
  const { page = 1, limit = 20, sortBy = 'date' } = opts
  const orderBy = sortBy === 'score'
    ? [{ score: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ createdAt: 'desc' as const }]

  const [items, total] = await Promise.all([
    prisma.movieRating.findMany({
      where:   { userId },
      orderBy,
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.movieRating.count({ where: { userId } }),
  ])

  return { items: items.map(toData), total, hasMore: page * limit < total }
}

export async function getRatingStats(userId: string): Promise<RatingStats> {
  const allRatings = await prisma.movieRating.findMany({
    where:   { userId },
    orderBy: { score: 'desc' },
    select: {
      score: true, storytelling: true, characters: true,
      entertainment: true, emotion: true, complexity: true, suspense: true,
      tmdbId: true, title: true, posterPath: true, createdAt: true,
    },
  })

  if (allRatings.length === 0) {
    return {
      totalRatings: 0, averageScore: 0,
      distribution: { '1-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 },
      perfectScores: 0,
      averageSubRatings: { storytelling: null, characters: null, entertainment: null, emotion: null, complexity: null, suspense: null },
      topRatedMovies: [], recentRatings: [],
    }
  }

  const totalRatings = allRatings.length
  const averageScore = allRatings.reduce((s, r) => s + r.score, 0) / totalRatings

  const distribution: Record<string, number> = { '1-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
  for (const r of allRatings) {
    if (r.score <= 20)       distribution['1-20']++
    else if (r.score <= 40)  distribution['21-40']++
    else if (r.score <= 60)  distribution['41-60']++
    else if (r.score <= 80)  distribution['61-80']++
    else                     distribution['81-100']++
  }

  const perfectScores = allRatings.filter(r => r.score === 100).length

  const avgSub = (key: keyof typeof allRatings[0]) => {
    const vals = allRatings.map(r => r[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)) : null
  }

  return {
    totalRatings,
    averageScore: parseFloat(averageScore.toFixed(1)),
    distribution,
    perfectScores,
    averageSubRatings: {
      storytelling:  avgSub('storytelling'),
      characters:    avgSub('characters'),
      entertainment: avgSub('entertainment'),
      emotion:       avgSub('emotion'),
      complexity:    avgSub('complexity'),
      suspense:      avgSub('suspense'),
    },
    topRatedMovies: allRatings.slice(0, 10).map(r => ({
      tmdbId: r.tmdbId, title: r.title, posterPath: r.posterPath, score: r.score,
    })),
    recentRatings: [...allRatings]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(r => ({
        tmdbId: r.tmdbId, title: r.title, posterPath: r.posterPath,
        score: r.score, createdAt: r.createdAt.toISOString(),
      })),
  }
}

// ─── Taste profile recalculation ──────────────────────────────────────────────
// Re-derives the user's Movie DNA from all their ratings using:
//   • Exponential score weighting  (100 → 4×, 95 → 2.5×, 80 → 1.5×, 70 → 0.8×, 60 → 0.4×, <60 → 0.15×)
//   • Correct sub-rating → DNA dimension mapping
//   • Watchlist genre IDs so computeMovieVibe gets real signals
//   • Adaptive blend ratio (more ratings = more weight on ratings-derived DNA)
//   • Snapshot of old DNA saved before update (for "Your Taste Is Evolving" widget)

/** Exponential weighting: highly-rated films matter far more than middling ones */
function scoreToWeight(score: number): number {
  if (score >= 95) return 4.0
  if (score >= 90) return 2.5
  if (score >= 80) return 1.5
  if (score >= 70) return 0.8
  if (score >= 60) return 0.4
  return 0.15
}

// Re-exported for use in top-five.ts and other services
export { ratingBlendRatio } from './ratings-helpers'
import { ratingBlendRatio } from './ratings-helpers'

export async function recalcTasteProfile(userId: string): Promise<void> {
  const { computeMovieVibe } = await import('./movie-vibe')
  const { TOP5_WEIGHTS }     = await import('./top-five')

  // Fetch everything needed: profile, ratings, watchlist metadata, and Top 5
  const [user, ratings, watchlistItems, top5Movies] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { tasteProfile: true },
    }),
    prisma.movieRating.findMany({
      where:  { userId },
      select: {
        tmdbId: true, score: true,
        storytelling: true, characters: true, entertainment: true,
        emotion: true, complexity: true, suspense: true,
      },
    }),
    prisma.watchlistItem.findMany({
      where:  { userId },
      select: { tmdbId: true, genreIds: true, runtime: true, voteAverage: true },
    }),
    prisma.topFiveMovie.findMany({
      where:   { userId },
      orderBy: { position: 'asc' },
      select:  { tmdbId: true, genreIds: true, releaseDate: true, position: true },
    }),
  ])

  if (!user?.tasteProfile) return
  // Need at least ratings OR top 5 to do anything meaningful
  if (ratings.length === 0 && top5Movies.length === 0) return

  // Build a quick lookup: tmdbId → watchlist metadata
  const watchlistMap = new Map(watchlistItems.map(w => [w.tmdbId, w]))

  const dims: (keyof DNAScores)[] = [
    'suspenseScore', 'emotionalImpactScore', 'complexityScore',
    'humorScore', 'realismScore', 'actionScore', 'darknessScore',
  ]

  // Weighted accumulators per DNA dimension
  const sums:    Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>
  const weights: Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>

  for (const r of ratings) {
    const meta = watchlistMap.get(r.tmdbId)

    // Use real genre IDs from watchlist when available — this is the main fix vs. the old `genres: []`
    const movieVibe = computeMovieVibe({
      id:                r.tmdbId,
      genres:            meta?.genreIds?.map(id => ({ id, name: '' })) ?? [],
      runtime:           meta?.runtime ?? null,
      vote_average:      meta?.voteAverage ?? 7,
      vote_count:        200,
      popularity:        50,
      release_date:      '',
      original_language: 'en',
    })

    // ── Sub-rating → DNA dimension mapping ──────────────────────────────────
    // Each sub-rating blends into one or more DNA dimensions with specific weights.
    // These mappings reflect what each dimension actually measures:
    //   storytelling: cognitive complexity + narrative emotional pull
    //   characters:   empathy (emotion) + realism of people + narrative depth
    //   entertainment:action energy + some humor
    //   emotion:      pure emotional impact
    //   complexity:   pure cognitive complexity
    //   suspense:     pure suspense

    if (r.storytelling !== null) {
      const v = r.storytelling * 1.0  // already 1-10 scale
      movieVibe.complexityScore      = movieVibe.complexityScore      * 0.3 + v * 0.7
      movieVibe.emotionalImpactScore = movieVibe.emotionalImpactScore * 0.6 + v * 0.4
    }
    if (r.characters !== null) {
      const v = r.characters * 1.0
      movieVibe.emotionalImpactScore = movieVibe.emotionalImpactScore * 0.4 + v * 0.6
      movieVibe.realismScore         = movieVibe.realismScore         * 0.8 + v * 0.2
      movieVibe.complexityScore      = movieVibe.complexityScore      * 0.8 + v * 0.2
    }
    if (r.entertainment !== null) {
      const v = r.entertainment * 1.0
      movieVibe.actionScore = movieVibe.actionScore * 0.4 + v * 0.6
      movieVibe.humorScore  = movieVibe.humorScore  * 0.6 + v * 0.4
    }
    if (r.emotion !== null) {
      movieVibe.emotionalImpactScore = r.emotion * 1.0
    }
    if (r.complexity !== null) {
      movieVibe.complexityScore = r.complexity * 1.0
    }
    if (r.suspense !== null) {
      movieVibe.suspenseScore = r.suspense * 1.0
    }

    // Exponential weight: highly-rated films pull the DNA far more than mediocre ones
    const w = scoreToWeight(r.score)

    // Direction: high score → pull DNA toward this film's vibe
    //            low score  → pull DNA away (use mirror: 10 - dim)
    const positive = r.score >= 60  // neutral-ish threshold

    for (const dim of dims) {
      const target = positive
        ? movieVibe[dim]          // like this film → want more of this
        : 10 - movieVibe[dim]     // dislike this film → want the opposite
      sums[dim]    += target * w
      weights[dim] += w
    }
  }

  // ── Compute Top 5 signal ──────────────────────────────────────────────────
  // Each Top 5 film contributes a genre-based vibe, weighted by rank position.
  // #1 = 1.0×, #2 = 0.9×, ..., #5 = 0.6×
  const t5Sums:    Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>
  const t5Weights: Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>

  for (const m of top5Movies) {
    const vibe = computeMovieVibe({
      id:                m.tmdbId,
      genres:            m.genreIds.map(id => ({ id, name: '' })),
      runtime:           null,
      vote_average:      7.5,   // neutral quality assumption
      vote_count:        500,
      popularity:        60,
      release_date:      m.releaseDate ?? '',
      original_language: 'en',
    })
    const w = TOP5_WEIGHTS[m.position] ?? 0.5
    for (const dim of dims) {
      t5Sums[dim]    += vibe[dim] * w
      t5Weights[dim] += w
    }
  }

  const hasTop5 = top5Movies.length >= 1

  // ── Three-way blend: Top 5 anchor + ratings refinement + existing inertia ──
  // Top 5 always gets 35% when ≥3 movies present (scales linearly below that).
  // Remaining 65% splits between ratings-derived and existing DNA per rating count.
  const t5Share       = hasTop5
    ? (top5Movies.length >= 3 ? 0.35 : (top5Movies.length / 3) * 0.35)
    : 0
  const remaining     = 1 - t5Share
  const rw            = ratingBlendRatio(ratings.length)  // 0.30–0.70
  const ratingShare   = rw   * remaining
  const existingShare = (1 - rw) * remaining

  const existing: DNAScores = {
    suspenseScore:        user.tasteProfile.suspenseScore,
    emotionalImpactScore: user.tasteProfile.emotionalImpactScore,
    complexityScore:      user.tasteProfile.complexityScore,
    humorScore:           user.tasteProfile.humorScore,
    realismScore:         user.tasteProfile.realismScore,
    actionScore:          user.tasteProfile.actionScore,
    darknessScore:        user.tasteProfile.darknessScore,
  }

  const updated: Partial<Record<keyof DNAScores, number>> = {}
  for (const dim of dims) {
    const ratingDerived = weights[dim] > 0 ? sums[dim] / weights[dim] : existing[dim]
    const t5Derived     = t5Weights[dim] > 0 ? t5Sums[dim] / t5Weights[dim] : existing[dim]

    const blended =
      t5Derived    * t5Share     +
      ratingDerived * ratingShare +
      existing[dim] * existingShare

    updated[dim] = Math.min(10, Math.max(1, parseFloat(blended.toFixed(2))))
  }

  // ── Save snapshot of old DNA before overwriting ───────────────────────────
  // Only snapshot if the profile has never been snapshotted, or if > 7 days old,
  // or if the rating count crossed a meaningful threshold (every 5 ratings).
  const profile         = user.tasteProfile
  const prevCount       = profile.ratingCount ?? 0
  const shouldSnapshot  =
    !profile.dnaSnapshotAt ||
    Date.now() - profile.dnaSnapshotAt.getTime() > 7 * 24 * 60 * 60 * 1000 ||
    Math.floor(ratings.length / 5) > Math.floor(prevCount / 5)

  const snapshotData = shouldSnapshot
    ? {
        dnaSnapshot:   existing as unknown as Record<string, number>,
        dnaSnapshotAt: new Date(),
      }
    : {}

  await prisma.tasteProfile.update({
    where: { userId },
    data:  {
      ...updated,
      ratingCount: ratings.length,
      ...snapshotData,
      updatedAt: new Date(),
    },
  })
}

// ─── Recommendation boost helpers ─────────────────────────────────────────────

/**
 * Returns a rating signal object useful for recommendation scoring.
 * Maps genre_id → average rating score across user's rated films in that genre.
 * Also returns the set of already-rated tmdbIds to exclude or weight.
 */
export async function getRatingSignalsForUser(userId: string): Promise<{
  ratedIds:       Map<number, number>  // tmdbId → score
  highRatedIds:   Set<number>           // score >= 75
  lowRatedIds:    Set<number>           // score <= 35
}> {
  const ratings = await prisma.movieRating.findMany({
    where:   { userId },
    select:  { tmdbId: true, score: true },
  })

  const ratedIds     = new Map<number, number>()
  const highRatedIds = new Set<number>()
  const lowRatedIds  = new Set<number>()

  for (const r of ratings) {
    ratedIds.set(r.tmdbId, r.score)
    if (r.score >= 75) highRatedIds.add(r.tmdbId)
    if (r.score <= 35) lowRatedIds.add(r.tmdbId)
  }

  return { ratedIds, highRatedIds, lowRatedIds }
}

// ─── Compatibility helper ─────────────────────────────────────────────────────

/**
 * Returns a 0-15 compatibility score bonus based on how similarly
 * two users rate the same movies.
 */
export async function ratingCompatibilityScore(
  userAId: string,
  userBId: string,
): Promise<{ score: number; sharedRatedMovies: number }> {
  const [aRatings, bRatings] = await Promise.all([
    prisma.movieRating.findMany({ where: { userId: userAId }, select: { tmdbId: true, score: true } }),
    prisma.movieRating.findMany({ where: { userId: userBId }, select: { tmdbId: true, score: true } }),
  ])

  const bMap = new Map(bRatings.map(r => [r.tmdbId, r.score]))
  const shared = aRatings.filter(r => bMap.has(r.tmdbId))

  if (shared.length === 0) return { score: 0, sharedRatedMovies: 0 }

  const totalDiff = shared.reduce((sum, r) => {
    const diff = Math.abs(r.score - bMap.get(r.tmdbId)!)
    return sum + diff
  }, 0)

  const avgDiff  = totalDiff / shared.length   // 0-99
  const rawScore = Math.max(0, 15 - (avgDiff / 99) * 15)
  return { score: Math.round(rawScore), sharedRatedMovies: shared.length }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toData(r: {
  id: string; tmdbId: number; title: string; posterPath: string | null
  releaseDate: string | null; score: number
  storytelling: number | null; characters: number | null; entertainment: number | null
  emotion: number | null; complexity: number | null; suspense: number | null
  review: string | null; createdAt: Date; updatedAt: Date
}): MovieRatingData {
  return {
    id:            r.id,
    tmdbId:        r.tmdbId,
    title:         r.title,
    posterPath:    r.posterPath,
    releaseDate:   r.releaseDate,
    score:         r.score,
    storytelling:  r.storytelling,
    characters:    r.characters,
    entertainment: r.entertainment,
    emotion:       r.emotion,
    complexity:    r.complexity,
    suspense:      r.suspense,
    review:        r.review,
    createdAt:     r.createdAt.toISOString(),
    updatedAt:     r.updatedAt.toISOString(),
  }
}
