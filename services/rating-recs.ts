/**
 * Rating-Based Recommendation Engine
 * ─────────────────────────────────────
 * Generates a "Based On Your Ratings" shelf by:
 *   1. Taking the user's top-rated films (score ≥ 85)
 *   2. Fetching TMDb "recommendations" for each anchor film (deduplicated)
 *   3. Scoring each candidate against the DNA derived from those top-rated films
 *   4. Filtering out films the user already rated / already seen in watchlist
 *   5. Returning the top results with explanations ("Because you rated X 98…")
 */

import { prisma } from '@/lib/db'
import { getMovieRecommendations } from './tmdb'
import { computeMovieVibe } from './movie-vibe'
import type { RatingRec, DNAScores } from '@/types'

const ANCHOR_THRESHOLD = 85  // minimum score for a film to be an anchor
const MAX_ANCHORS      = 8   // max films to use as anchors (avoid TMDb rate limits)
const MAX_RESULTS      = 12  // final recommendations to return

// ─── DNA similarity score (0-100) ─────────────────────────────────────────────

function dnaSimilarity(a: DNAScores, b: DNAScores): number {
  const dims: (keyof DNAScores)[] = [
    'suspenseScore', 'emotionalImpactScore', 'complexityScore',
    'humorScore', 'realismScore', 'actionScore', 'darknessScore',
  ]
  // Mean absolute error across 7 dimensions, each 1-10 → max error = 9
  const mae = dims.reduce((sum, d) => sum + Math.abs(a[d] - b[d]), 0) / dims.length
  return Math.round(Math.max(0, 100 - (mae / 9) * 100))
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getRatingBasedRecs(userId: string): Promise<RatingRec[]> {
  // 1. Fetch user's ratings, taste profile, and watchlist
  const [ratings, profile, watchlist] = await Promise.all([
    prisma.movieRating.findMany({
      where:   { userId },
      orderBy: { score: 'desc' },
      select:  { tmdbId: true, title: true, posterPath: true, score: true },
    }),
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.watchlistItem.findMany({
      where:  { userId },
      select: { tmdbId: true },
    }),
  ])

  // Need a taste profile + at least one high-rated film
  const anchors = ratings.filter(r => r.score >= ANCHOR_THRESHOLD).slice(0, MAX_ANCHORS)
  if (anchors.length === 0 || !profile) return []

  // Build DNA from taste profile
  const userDNA: DNAScores = {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }

  // Set of already-seen tmdbIds to exclude
  const seenIds = new Set([
    ...ratings.map(r => r.tmdbId),
    ...watchlist.map(w => w.tmdbId),
  ])

  // Map anchor tmdbId → anchor info (for explanation text)
  const anchorMap = new Map(anchors.map(a => [a.tmdbId, a]))

  // 2. Fetch TMDb recommendations for each anchor in parallel
  const recResults = await Promise.allSettled(
    anchors.map(a => getMovieRecommendations(a.tmdbId))
  )

  // Aggregate: candidate tmdbId → { movie, which anchors recommended it }
  interface CandidateMeta {
    tmdbId:     number
    title:      string
    posterPath: string | null
    releaseDate:string | null
    anchorIds:  number[]  // which anchor films recommended this
  }

  const candidates = new Map<number, CandidateMeta>()

  recResults.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    const anchorTmdbId = anchors[idx].tmdbId

    for (const movie of result.value.results ?? []) {
      if (seenIds.has(movie.id)) continue
      if (!movie.poster_path)    continue  // require art

      const existing = candidates.get(movie.id)
      if (existing) {
        existing.anchorIds.push(anchorTmdbId)
      } else {
        candidates.set(movie.id, {
          tmdbId:      movie.id,
          title:       movie.title,
          posterPath:  movie.poster_path,
          releaseDate: movie.release_date ?? null,
          anchorIds:   [anchorTmdbId],
        })
      }
    }
  })

  if (candidates.size === 0) return []

  // 3. Score each candidate against user DNA
  interface ScoredCandidate extends CandidateMeta {
    matchScore: number
  }

  const scored: ScoredCandidate[] = []
  for (const candidate of candidates.values()) {
    const movieDNA = computeMovieVibe({
      id:                candidate.tmdbId,
      genres:            [],
      runtime:           null,
      vote_average:      7,
      vote_count:        200,
      popularity:        50,
      release_date:      candidate.releaseDate ?? '',
      original_language: 'en',
    })

    // Bonus for being recommended by multiple anchor films
    const diversityBonus = Math.min(15, (candidate.anchorIds.length - 1) * 5)
    const dnaScore       = dnaSimilarity(userDNA, movieDNA)
    const matchScore     = Math.min(100, dnaScore + diversityBonus)

    scored.push({ ...candidate, matchScore })
  }

  // Sort by match score desc, take top results
  scored.sort((a, b) => b.matchScore - a.matchScore)
  const top = scored.slice(0, MAX_RESULTS)

  // 4. Build final RatingRec objects with explanation
  return top.map(c => {
    const becauseAnchors = c.anchorIds
      .map(id => anchorMap.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const explanation = buildExplanation(becauseAnchors, c.matchScore)

    return {
      tmdbId:      c.tmdbId,
      title:       c.title,
      posterPath:  c.posterPath,
      releaseDate: c.releaseDate,
      matchScore:  c.matchScore,
      because:     becauseAnchors.map(a => ({ tmdbId: a.tmdbId, title: a.title, score: a.score })),
      explanation,
    }
  })
}

function buildExplanation(
  anchors: { title: string; score: number }[],
  matchScore: number,
): string {
  if (anchors.length === 0) return `${matchScore}% DNA match`

  const top = anchors[0]
  const prefix = matchScore >= 85 ? 'Strong match' : matchScore >= 70 ? 'Good match' : 'Possible match'

  if (anchors.length === 1) {
    return `${prefix} · Because you rated ${top.title} ${top.score}`
  }
  if (anchors.length === 2) {
    return `${prefix} · Bridges your love of ${top.title} (${top.score}) and ${anchors[1].title} (${anchors[1].score})`
  }
  return `${prefix} · Recommended based on ${anchors.length} films you rated highly, including ${top.title} (${top.score})`
}
