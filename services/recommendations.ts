import { prisma } from '@/lib/db'
import { getMovieRecommendations } from './tmdb'
import { computeMovieVibe } from './movie-vibe'
import { getRatingSignalsForUser } from './ratings'
import { getRecommendationPreferenceProfile } from './recommendation-preferences'
import {
  isCandidateAllowed,
  preferenceScoreAdjustment,
  type RecommendationPreferenceProfile,
} from '@/lib/recommendation-preferences'
import type { DNAScores, TMDbMovie } from '@/types'

// ─── Genre ID → display name ──────────────────────────────────────────────────
const GENRE_ID_TO_NAME: Record<number, string> = {
  28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
  80: 'crime', 99: 'documentary', 18: 'drama', 14: 'fantasy',
  36: 'history', 27: 'horror', 9648: 'mystery', 10749: 'romance',
  878: 'sci-fi', 53: 'thriller', 10752: 'war', 37: 'western',
}

// ─── DNA dimension readable labels ───────────────────────────────────────────
const DNA_LABELS: Partial<Record<keyof DNAScores, string>> = {
  complexityScore:      'complex, layered storytelling',
  suspenseScore:        'tension and suspense',
  emotionalImpactScore: 'emotional depth',
  darknessScore:        'dark, intense themes',
  humorScore:           'humor and wit',
  actionScore:          'kinetic action',
  realismScore:         'grounded realism',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findBestMatchingFavorite(
  candidate: TMDbMovie,
  favorites: Array<{ tmdbId: number; title: string; genreIds: number[] }>
): string | null {
  let bestTitle: string | null = null
  let bestOverlap = 0

  for (const fav of favorites) {
    const overlap = candidate.genre_ids.filter(g => (fav.genreIds ?? []).includes(g)).length
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestTitle = fav.title
    }
  }

  return bestOverlap >= 1 ? bestTitle : null
}

function similarFavoriteSourceStrength(
  candidate: TMDbMovie,
  favorites: Array<{ genreIds: number[] }>,
): number {
  const maxOverlap = favorites.reduce((best, favorite) => {
    const overlap = candidate.genre_ids.filter(id => favorite.genreIds.includes(id)).length
    return Math.max(best, overlap)
  }, 0)
  return Math.min(1, 0.55 + maxOverlap * 0.15)
}

function getDNAReason(movieDNA: DNAScores, userDNA: DNAScores): string | null {
  const dimensions = Object.keys(DNA_LABELS) as (keyof DNAScores)[]

  let bestKey: keyof DNAScores | null = null
  let bestScore = 0

  for (const dim of dimensions) {
    const diff = Math.abs(movieDNA[dim] - userDNA[dim])
    // Only cite high movie score + close user match
    if (movieDNA[dim] >= 6.5 && diff < 2) {
      const relevance = movieDNA[dim] - diff
      if (relevance > bestScore) {
        bestScore = relevance
        bestKey = dim
      }
    }
  }

  return bestKey ? `matches your appreciation for ${DNA_LABELS[bestKey]}` : null
}

function scoreCandidate(
  movie: TMDbMovie,
  favoriteIds: Set<number>,
  userGenres: string[],
  userDNA: DNAScores,
  favorites: Array<{ tmdbId: number; title: string; genreIds: number[] }>,
  ratingSignals: {
    ratedIds: Map<number, number>
    genreAffinity: Map<number, { average: number; count: number }>
  },
  preferenceProfile: RecommendationPreferenceProfile,
): { score: number; explanation: string } | null {
  // Exclude films already in favorites
  if (favoriteIds.has(movie.id)) return null
  // Exclude films with no poster (usually low-quality entries)
  if (!movie.poster_path) return null
  // Minimum quality bar
  if (movie.vote_count < 50) return null
  if (!isCandidateAllowed(movie, preferenceProfile)) return null

  let score = 0
  const reasonParts: string[] = []

  // ── 0. Rating signals ─────────────────────────────────────────────────────
  // Skip films the user has already rated (they've already seen it)
  if (ratingSignals.ratedIds.has(movie.id)) return null

  // ── 1. Genre match (0–25) ─────────────────────────────────────────────────
  const movieGenreNames = movie.genre_ids.map(id => GENRE_ID_TO_NAME[id]).filter(Boolean)
  const matchedGenres   = movieGenreNames.filter(g =>
    userGenres.map(u => u.toLowerCase()).includes(g)
  )
  const genreScore = Math.min(matchedGenres.length * 10, 25)
  score += genreScore

  if (matchedGenres.length > 0) {
    reasonParts.push(`fits your love of ${matchedGenres.slice(0, 2).join(' and ')} films`)
  }

  // ── 2. DNA compatibility (0–35) ───────────────────────────────────────────
  const movieDNA    = computeMovieVibe({
    id:                movie.id,
    genres:            (movie.genre_ids ?? []).map(id => ({ id, name: '' })),
    runtime:           null,
    vote_average:      movie.vote_average,
    vote_count:        movie.vote_count,
    popularity:        movie.popularity,
    release_date:      movie.release_date,
    original_language: movie.original_language,
  })
  const dimensions  = Object.keys(userDNA) as (keyof DNAScores)[]
  const totalDiff   = dimensions.reduce((sum, d) => sum + Math.abs(movieDNA[d] - userDNA[d]), 0)
  const avgDiff     = totalDiff / dimensions.length
  const dnaScore    = Math.max(0, 35 - avgDiff * 4.5)
  score += dnaScore

  const dnaReason = getDNAReason(movieDNA, userDNA)
  if (dnaReason) reasonParts.push(dnaReason)

  // Explicit onboarding boundaries can outweigh generic popularity/quality.
  score += preferenceScoreAdjustment(movie, preferenceProfile, {
    movieDNA,
    sourceStrength: similarFavoriteSourceStrength(movie, favorites),
  })

  // ── 3. Quality (0–20) ─────────────────────────────────────────────────────
  const qualityScore = Math.min(
    (movie.vote_average / 10) * 15 + (movie.vote_count > 500 ? 5 : 0),
    20
  )
  score += qualityScore

  // ── 4. Favorite movie similarity bonus (0–10) ─────────────────────────────
  const similarFavorite = findBestMatchingFavorite(movie, favorites)
  if (similarFavorite) {
    score = Math.min(score + 10, 100)
    reasonParts.unshift(`shares the atmosphere of ${similarFavorite}`)
  }

  // ── 5. Rating-pattern affinity (0–10) ─────────────────────────────────────
  // If the user has highly rated films in the same genres → boost
  // If the user has poorly rated films in the same genres → penalise
  const matchedGenreEvidence = movie.genre_ids
    .map(genreId => ratingSignals.genreAffinity.get(genreId))
    .filter((evidence): evidence is { average: number; count: number } => Boolean(evidence))
  const highGenreOverlap = matchedGenreEvidence.some(evidence => evidence.average >= 75)
  const lowGenreOverlap  = matchedGenreEvidence.length > 0 &&
    matchedGenreEvidence.every(evidence => evidence.average <= 40)
  if (highGenreOverlap && matchedGenres.length > 0) {
    score = Math.min(score + 7, 100)
    if (!reasonParts.some(r => r.includes('love of'))) {
      reasonParts.push('aligns with your highest-rated films')
    }
  }
  if (lowGenreOverlap && matchedGenres.length > 0 && !highGenreOverlap) {
    score = Math.max(score - 10, 0)
  }

  // ── Build explanation ─────────────────────────────────────────────────────
  const explanation =
    reasonParts.length > 0
      ? `Recommended because it ${reasonParts.slice(0, 2).join(' and ')}.`
      : 'Aligns with your overall taste profile.'

  return { score: Math.min(Math.round(score), 100), explanation }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates and stores up to 30 recommendations for a user.
 * Refreshes current recommendations while preserving rows that carry feedback.
 */
export async function generateRecommendations(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingMovies: { select: { tmdbId: true, title: true, genreIds: true, posterPath: true, releaseDate: true } },
      tasteProfile:     true,
      preferences:      { select: { genres: true } },
    },
  })

  if (!user?.tasteProfile || !user.preferences || user.onboardingMovies.length === 0) return

  const dna: DNAScores = {
    suspenseScore:        user.tasteProfile.suspenseScore,
    emotionalImpactScore: user.tasteProfile.emotionalImpactScore,
    complexityScore:      user.tasteProfile.complexityScore,
    humorScore:           user.tasteProfile.humorScore,
    realismScore:         user.tasteProfile.realismScore,
    actionScore:          user.tasteProfile.actionScore,
    darknessScore:        user.tasteProfile.darknessScore,
  }

  const favoriteIds = new Set(user.onboardingMovies.map(m => m.tmdbId))
  const userGenres  = user.preferences.genres

  // Fetch TMDb recommendations + rating signals in parallel
  const [allCandidateArrays, ratingSignals, preferenceProfile] = await Promise.all([
    Promise.allSettled(user.onboardingMovies.map(m => getMovieRecommendations(m.tmdbId))),
    getRatingSignalsForUser(userId),
    getRecommendationPreferenceProfile(userId),
  ])

  // Merge + deduplicate candidates
  const seen   = new Set<number>()
  const candidates: TMDbMovie[] = []
  for (const result of allCandidateArrays) {
    if (result.status !== 'fulfilled') continue
    for (const movie of result.value.results) {
      if (!seen.has(movie.id)) {
        seen.add(movie.id)
        candidates.push(movie)
      }
    }
  }

  // Score each candidate
  const scored = candidates
    .map(movie => {
      const result = scoreCandidate(
        movie,
        favoriteIds,
        userGenres,
        dna,
        user.onboardingMovies,
        ratingSignals,
        preferenceProfile,
      )
      if (!result) return null
      return { movie, ...result }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  if (scored.length === 0) return

  // Upsert the fresh set and only remove stale rows that have no feedback.
  // RecommendationFeedback belongs to a Recommendation row, so deleting every
  // row here used to erase the very signals the ranking engine should learn from.
  const freshTmdbIds = scored.map(({ movie }) => movie.id)
  await prisma.$transaction([
    ...scored.map(({ movie, score, explanation }) => prisma.recommendation.upsert({
      where: { userId_tmdbId: { userId, tmdbId: movie.id } },
      create: {
        userId,
        tmdbId:      movie.id,
        title:       movie.title,
        posterPath:  movie.poster_path,
        releaseDate: movie.release_date,
        matchScore:  score,
        explanation,
      },
      update: {
        title:       movie.title,
        posterPath:  movie.poster_path,
        releaseDate: movie.release_date,
        matchScore:  score,
        explanation,
      },
    })),
    prisma.recommendation.deleteMany({
      where: {
        userId,
        tmdbId: { notIn: freshTmdbIds },
        feedback: { is: null },
      },
    }),
  ])
}

/**
 * Returns paginated recommendations from the database.
 * Auto-generates if none exist yet.
 */
export async function getRecommendations(
  userId: string,
  page = 1,
  limit = 10
): Promise<{ items: import('@/types').RecommendationItem[]; hasMore: boolean; total: number }> {
  const count = await prisma.recommendation.count({ where: { userId } })

  if (count === 0) {
    await generateRecommendations(userId)
  }

  const items = await prisma.recommendation.findMany({
    where:   { userId },
    orderBy: { matchScore: 'desc' },
    skip:    (page - 1) * limit,
    take:    limit,
    select: {
      id: true, tmdbId: true, title: true, posterPath: true,
      releaseDate: true, matchScore: true, explanation: true,
    },
  })

  const total = await prisma.recommendation.count({ where: { userId } })

  return {
    items,
    hasMore: page * limit < total,
    total,
  }
}
