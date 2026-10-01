import { prisma } from '@/lib/db'
import { logActivity } from './activity'
import { generateDNA } from './dna'
import { getMovieById, getMovieKeywords } from './tmdb'
import {
  analyzeReviewTraits,
  applyTraitEvidence,
  computeDeterministicDNA,
  DNA_DIMENSIONS,
  NEUTRAL_DNA,
  type RatingDnaEvidence,
} from './dna-v2'
import { computeMovieVibe, type MovieVibeInput } from './movie-vibe'
import type { MovieRatingData, RatingStats, DNAScores } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpsertRatingInput {
  tmdbId:        number
  title:         string
  posterPath:    string | null
  releaseDate:   string | null
  genreIds?:     number[]
  runtime?:      number | null
  voteAverage?:  number | null
  voteCount?:    number | null
  popularity?:   number | null
  originalLanguage?: string | null
  budget?:       number | null
  keywords?:     string[]
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

// Keep the response projection limited to the original rating columns. This
// lets reads continue to work while an additive metadata migration is rolling
// out, and gives the write path a safe legacy retry below.
const RATING_DATA_SELECT = {
  id: true,
  tmdbId: true,
  title: true,
  posterPath: true,
  releaseDate: true,
  score: true,
  storytelling: true,
  characters: true,
  entertainment: true,
  emotion: true,
  complexity: true,
  suspense: true,
  review: true,
  createdAt: true,
  updatedAt: true,
} as const

function isMissingColumnError(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'P2022'
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function upsertRating(
  userId: string,
  input: UpsertRatingInput,
): Promise<MovieRatingData> {
  // Movie pages send this evidence with the rating. API consumers that do not
  // are hydrated once from TMDb, then the evidence is persisted for every
  // future deterministic recalculation.
  const suppliedMetadata = input.genreIds !== undefined
    ? normalizeMetadata(input)
    : null
  const metadata = suppliedMetadata ?? await fetchMovieMetadata(input.tmdbId)

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

  let rating
  try {
    rating = await prisma.movieRating.upsert({
      where:  { userId_tmdbId: { userId, tmdbId: input.tmdbId } },
      create: {
        ...data,
        ...(metadata ?? { genreIds: [], keywords: [], dnaMetadataVersion: 0 }),
      },
      // A temporary TMDb failure must not erase evidence already cached on an
      // existing rating.
      update: { ...data, ...(metadata ?? {}), updatedAt: new Date() },
      select: RATING_DATA_SELECT,
    })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    // Some production environments historically deployed application code
    // before running additive Prisma migrations. Save the user's rating using
    // the legacy columns in that window; once the migration lands, the normal
    // path above resumes caching metadata and later DNA recalculation hydrates
    // legacy rows whose metadata version defaults to 0.
    rating = await prisma.movieRating.upsert({
      where:  { userId_tmdbId: { userId, tmdbId: input.tmdbId } },
      create: data,
      update: { ...data, updatedAt: new Date() },
      select: RATING_DATA_SELECT,
    })
  }

  // Keep the request alive until the derived profile is consistent. A DNA
  // failure never rolls back the user's successfully saved rating.
  await recalcTasteProfile(userId).catch(() => {})
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

  await recalcTasteProfile(userId).catch(() => {})
}

export async function getRating(
  userId: string,
  tmdbId: number,
): Promise<MovieRatingData | null> {
  const r = await prisma.movieRating.findUnique({
    where: { userId_tmdbId: { userId, tmdbId } },
    select: RATING_DATA_SELECT,
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
      select:  RATING_DATA_SELECT,
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

// ─── Taste profile recalculation (DNA v2) ────────────────────────────────────

interface CachedMovieMetadata {
  genreIds: number[]
  runtime: number | null
  voteAverage: number | null
  voteCount: number | null
  popularity: number | null
  originalLanguage: string | null
  budget: number | null
  keywords: string[]
  dnaMetadataVersion: number
}

function normalizeMetadata(input: Pick<UpsertRatingInput,
  'genreIds' | 'runtime' | 'voteAverage' | 'voteCount' | 'popularity' |
  'originalLanguage' | 'budget' | 'keywords'
>): CachedMovieMetadata {
  return {
    genreIds: (input.genreIds ?? []).filter(Number.isInteger),
    runtime: input.runtime ?? null,
    voteAverage: input.voteAverage ?? null,
    voteCount: input.voteCount ?? null,
    popularity: input.popularity ?? null,
    originalLanguage: input.originalLanguage ?? null,
    budget: input.budget ?? null,
    keywords: (input.keywords ?? []).map(keyword => keyword.toLowerCase()),
    dnaMetadataVersion: 1,
  }
}

async function fetchMovieMetadata(tmdbId: number): Promise<CachedMovieMetadata | null> {
  try {
    const [movie, keywords] = await Promise.all([
      getMovieById(tmdbId),
      getMovieKeywords(tmdbId),
    ])
    return normalizeMetadata({
      genreIds: movie.genres.map(genre => genre.id),
      runtime: movie.runtime,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      originalLanguage: movie.original_language,
      budget: movie.budget,
      keywords,
    })
  } catch {
    return null
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await work(values[index])
    }
  })
  await Promise.all(workers)
  return results
}

function clampDna(value: number): number {
  return Math.max(1, Math.min(10, value))
}

function refineVibeWithSubratings(vibe: DNAScores, rating: {
  storytelling: number | null
  characters: number | null
  entertainment: number | null
  emotion: number | null
  complexity: number | null
  suspense: number | null
}): DNAScores {
  const refined = { ...vibe }

  if (rating.storytelling !== null) {
    refined.complexityScore = refined.complexityScore * 0.3 + rating.storytelling * 0.7
    refined.emotionalImpactScore = refined.emotionalImpactScore * 0.6 + rating.storytelling * 0.4
  }
  if (rating.characters !== null) {
    refined.emotionalImpactScore = refined.emotionalImpactScore * 0.4 + rating.characters * 0.6
    refined.realismScore = refined.realismScore * 0.8 + rating.characters * 0.2
    refined.complexityScore = refined.complexityScore * 0.8 + rating.characters * 0.2
  }
  if (rating.entertainment !== null) {
    refined.actionScore = refined.actionScore * 0.4 + rating.entertainment * 0.6
    refined.humorScore = refined.humorScore * 0.6 + rating.entertainment * 0.4
  }
  if (rating.emotion !== null) refined.emotionalImpactScore = rating.emotion
  if (rating.complexity !== null) refined.complexityScore = rating.complexity
  if (rating.suspense !== null) refined.suspenseScore = rating.suspense

  for (const dim of DNA_DIMENSIONS) refined[dim] = clampDna(refined[dim])
  return refined
}

interface FallbackMetadata {
  genreIds: number[]
  releaseDate: string | null
  runtime: number | null
  voteAverage: number | null
}

function toMovieVibeInput(
  tmdbId: number,
  metadata: CachedMovieMetadata,
  releaseDate: string | null,
  fallback?: FallbackMetadata,
): MovieVibeInput {
  const genreIds = metadata.genreIds.length > 0 ? metadata.genreIds : fallback?.genreIds ?? []
  return {
    id: tmdbId,
    genres: genreIds.map(id => ({ id, name: '' })),
    runtime: metadata.runtime ?? fallback?.runtime ?? null,
    vote_average: metadata.voteAverage ?? fallback?.voteAverage ?? 7,
    vote_count: metadata.voteCount ?? 0,
    popularity: metadata.popularity ?? 50,
    release_date: releaseDate ?? fallback?.releaseDate ?? '',
    original_language: metadata.originalLanguage ?? 'en',
    budget: metadata.budget ?? 0,
  }
}

type RecalcJob = { queued: boolean; promise: Promise<void> }
const recalcJobs = new Map<string, RecalcJob>()

/**
 * Coalesce overlapping edits for one user. A change that arrives during a
 * rebuild guarantees one final pass over the newest evidence.
 */
export function recalcTasteProfile(userId: string): Promise<void> {
  const active = recalcJobs.get(userId)
  if (active) {
    active.queued = true
    return active.promise
  }

  const job: RecalcJob = { queued: false, promise: Promise.resolve() }
  recalcJobs.set(userId, job)
  job.promise = (async () => {
    do {
      job.queued = false
      await performTasteProfileRecalc(userId)
    } while (job.queued)
  })().finally(() => {
    if (recalcJobs.get(userId) === job) recalcJobs.delete(userId)
  })
  return job.promise
}

async function performTasteProfileRecalc(userId: string): Promise<void> {
  const [user, rawRatings, watchlistItems, topFiveMovies, reviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        tasteProfile: true,
        preferences: {
          select: {
            genres: true, pacing: true, endings: true, storytelling: true,
            tone: true, complexity: true, plotTwists: true,
            pacingScale: true, endingClosure: true, storytellingScale: true,
            toneScale: true, escapism: true, emotionalIntensity: true,
            eraOpenness: true, runtimePreference: true, popularityPreference: true,
            discoveryPreference: true, subtitleOpenness: true,
            violenceTolerance: true, horrorTolerance: true,
            animationOpenness: true, documentaryOpenness: true,
            excludedGenres: true,
          },
        },
        onboardingMovies: {
          select: {
            tmdbId: true, title: true, posterPath: true,
            releaseDate: true, genreIds: true,
          },
        },
      },
    }),
    prisma.movieRating.findMany({
      where: { userId },
      orderBy: [{ tmdbId: 'asc' }],
      select: {
        id: true, tmdbId: true, releaseDate: true, score: true, review: true,
        storytelling: true, characters: true, entertainment: true,
        emotion: true, complexity: true, suspense: true,
        genreIds: true, runtime: true, voteAverage: true, voteCount: true,
        popularity: true, originalLanguage: true, budget: true, keywords: true,
        dnaMetadataVersion: true,
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      select: {
        tmdbId: true, genreIds: true, releaseDate: true,
        runtime: true, voteAverage: true,
      },
    }),
    prisma.topFiveMovie.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      select: { tmdbId: true, genreIds: true, releaseDate: true, position: true },
    }),
    prisma.review.findMany({
      where: { userId },
      select: { tmdbId: true, rating: true, body: true },
    }),
  ])

  if (!user) return

  // Backfill legacy rating rows once. Failures retain version 0 so a later
  // recalculation can retry without sacrificing the rating itself.
  const ratings = await mapWithConcurrency(rawRatings, 4, async rating => {
    if (rating.dnaMetadataVersion > 0) return rating
    const metadata = await fetchMovieMetadata(rating.tmdbId)
    if (!metadata) return rating
    await prisma.movieRating.update({ where: { id: rating.id }, data: metadata })
    return { ...rating, ...metadata }
  })

  const fallbackMap = new Map<number, FallbackMetadata>()
  for (const movie of user.onboardingMovies) {
    fallbackMap.set(movie.tmdbId, {
      genreIds: movie.genreIds,
      releaseDate: movie.releaseDate,
      runtime: null,
      voteAverage: null,
    })
  }
  for (const movie of topFiveMovies) {
    const current = fallbackMap.get(movie.tmdbId)
    fallbackMap.set(movie.tmdbId, {
      genreIds: movie.genreIds.length > 0 ? movie.genreIds : current?.genreIds ?? [],
      releaseDate: movie.releaseDate ?? current?.releaseDate ?? null,
      runtime: current?.runtime ?? null,
      voteAverage: current?.voteAverage ?? null,
    })
  }
  for (const movie of watchlistItems) {
    const current = fallbackMap.get(movie.tmdbId)
    fallbackMap.set(movie.tmdbId, {
      genreIds: movie.genreIds.length > 0 ? movie.genreIds : current?.genreIds ?? [],
      releaseDate: movie.releaseDate ?? current?.releaseDate ?? null,
      runtime: movie.runtime ?? current?.runtime ?? null,
      voteAverage: movie.voteAverage ?? current?.voteAverage ?? null,
    })
  }

  const reviewsByMovie = new Map(reviews.map(review => [review.tmdbId, review]))
  const evidence: RatingDnaEvidence[] = ratings.map(rating => {
    const metadata: CachedMovieMetadata = {
      genreIds: rating.genreIds,
      runtime: rating.runtime,
      voteAverage: rating.voteAverage,
      voteCount: rating.voteCount,
      popularity: rating.popularity,
      originalLanguage: rating.originalLanguage,
      budget: rating.budget,
      keywords: rating.keywords,
      dnaMetadataVersion: rating.dnaMetadataVersion,
    }
    let vibe = computeMovieVibe(
      toMovieVibeInput(rating.tmdbId, metadata, rating.releaseDate, fallbackMap.get(rating.tmdbId)),
      metadata.keywords,
    )
    vibe = refineVibeWithSubratings(vibe, rating)

    const prose = [rating.review, reviewsByMovie.get(rating.tmdbId)?.body]
      .filter((value): value is string => Boolean(value))
      .join(' ')
    if (prose) vibe = applyTraitEvidence(vibe, analyzeReviewTraits(prose), 0.35)

    return { vibe, score: rating.score, confidence: 1 }
  })

  const ratedIds = new Set(ratings.map(rating => rating.tmdbId))
  for (const review of reviews) {
    if (review.rating === null || ratedIds.has(review.tmdbId)) continue
    const traits = analyzeReviewTraits(review.body)
    if (Object.keys(traits).length === 0) continue
    evidence.push({
      vibe: applyTraitEvidence(NEUTRAL_DNA, traits, 0.8),
      score: review.rating,
      confidence: 0.4,
    })
  }

  const ratingMetadata = new Map(ratings.map(rating => [rating.tmdbId, rating]))
  const topFiveEvidence = topFiveMovies.map(movie => {
    const cached = ratingMetadata.get(movie.tmdbId)
    const metadata: CachedMovieMetadata = cached
      ? {
          genreIds: cached.genreIds,
          runtime: cached.runtime,
          voteAverage: cached.voteAverage,
          voteCount: cached.voteCount,
          popularity: cached.popularity,
          originalLanguage: cached.originalLanguage,
          budget: cached.budget,
          keywords: cached.keywords,
          dnaMetadataVersion: cached.dnaMetadataVersion,
        }
      : {
          genreIds: movie.genreIds,
          runtime: null,
          voteAverage: null,
          voteCount: null,
          popularity: null,
          originalLanguage: null,
          budget: null,
          keywords: [],
          dnaMetadataVersion: 0,
        }

    return {
      vibe: computeMovieVibe(
        toMovieVibeInput(movie.tmdbId, metadata, movie.releaseDate, fallbackMap.get(movie.tmdbId)),
        metadata.keywords,
      ),
      weight: Math.max(0.5, 1 - (movie.position - 1) * 0.1),
    }
  })

  const baseline = user.preferences
    ? generateDNA(user.onboardingMovies, user.preferences)
    : { ...NEUTRAL_DNA }
  const updated = computeDeterministicDNA({
    baseline,
    ratings: evidence,
    topFive: topFiveEvidence,
  })

  const existing = user.tasteProfile
    ? Object.fromEntries(DNA_DIMENSIONS.map(dim => [dim, user.tasteProfile![dim]])) as unknown as DNAScores
    : null
  const prevCount = user.tasteProfile?.ratingCount ?? 0
  const shouldSnapshot = Boolean(user.tasteProfile && (
    !user.tasteProfile.dnaSnapshotAt ||
    Date.now() - user.tasteProfile.dnaSnapshotAt.getTime() > 7 * 24 * 60 * 60 * 1000 ||
    Math.floor(ratings.length / 5) !== Math.floor(prevCount / 5)
  ))
  const snapshotData = shouldSnapshot && existing
    ? { dnaSnapshot: existing as unknown as Record<string, number>, dnaSnapshotAt: new Date() }
    : {}

  await prisma.tasteProfile.upsert({
    where: { userId },
    create: { userId, ...updated, ratingCount: ratings.length },
    update: {
      ...updated,
      ratingCount: ratings.length,
      ...snapshotData,
      updatedAt: new Date(),
    },
  })

  const { assignPersonality } = await import('./personality')
  await assignPersonality(userId).catch(() => {})
}

// ─── Recommendation boost helpers ─────────────────────────────────────────────

/**
 * Returns a rating signal object useful for recommendation scoring.
 * Maps genre_id → average rating score across user's rated films in that genre.
 * Also returns the set of already-rated tmdbIds to exclude or weight.
 */
export async function getRatingSignalsForUser(userId: string): Promise<{
  ratedIds:     Map<number, number>  // tmdbId → score
  genreAffinity: Map<number, { average: number; count: number }>
}> {
  const ratings = await prisma.movieRating.findMany({
    where:   { userId },
    select:  { tmdbId: true, score: true, genreIds: true },
  })

  const ratedIds = new Map<number, number>()
  const genreTotals = new Map<number, { total: number; count: number }>()

  for (const r of ratings) {
    ratedIds.set(r.tmdbId, r.score)
    for (const genreId of r.genreIds) {
      const current = genreTotals.get(genreId) ?? { total: 0, count: 0 }
      genreTotals.set(genreId, { total: current.total + r.score, count: current.count + 1 })
    }
  }

  const genreAffinity = new Map(
    [...genreTotals].map(([genreId, evidence]) => [
      genreId,
      { average: evidence.total / evidence.count, count: evidence.count },
    ]),
  )

  return { ratedIds, genreAffinity }
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
