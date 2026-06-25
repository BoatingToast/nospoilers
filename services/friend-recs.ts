/**
 * Friend-Based Recommendations
 * ─────────────────────────────
 * "Because Your Friends Loved It"
 *
 * Algorithm:
 *   1. Collect all high-rated movies (≥80) from all friends
 *   2. Exclude movies the current user has already seen/rated/watchlisted
 *   3. Score each candidate by: (a) how many friends loved it, (b) DNA match
 *   4. Return top results with friend attribution
 */

import { prisma } from '@/lib/db'
import { getFriendIds } from './friends'
import { computeMovieVibe } from './movie-vibe'
import type { DNAScores } from '@/types'

const FRIEND_RATING_THRESHOLD = 80

export interface FriendRec {
  tmdbId:     number
  title:      string
  posterPath: string | null
  matchScore: number   // DNA match 0-100
  friendRatings: { username: string; score: number }[]
  explanation: string
}

function dnaSimilarity(a: DNAScores, b: DNAScores): number {
  const keys = Object.keys(a) as (keyof DNAScores)[]
  const mae  = keys.reduce((s, k) => s + Math.abs(a[k] - b[k]), 0) / keys.length
  return Math.round(Math.max(0, 100 - (mae / 9) * 100))
}

export async function getFriendRecs(userId: string, limit = 12): Promise<FriendRec[]> {
  const [friendIds, profile, seen] = await Promise.all([
    getFriendIds(userId),
    prisma.tasteProfile.findUnique({ where: { userId } }),
    // Build set of movies user has interacted with
    Promise.all([
      prisma.movieRating.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.onboardingMovie.findMany({ where: { userId }, select: { tmdbId: true } }),
    ]),
  ])

  if (friendIds.length === 0 || !profile) return []

  const seenIds = new Set<number>([
    ...seen[0].map(r => r.tmdbId),
    ...seen[1].map(w => w.tmdbId),
    ...seen[2].map(o => o.tmdbId),
  ])

  const userDNA: DNAScores = {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }

  // Get friend ratings + usernames
  const [friendRatings, friendUsers] = await Promise.all([
    prisma.movieRating.findMany({
      where: { userId: { in: friendIds }, score: { gte: FRIEND_RATING_THRESHOLD } },
      select: { userId: true, tmdbId: true, title: true, posterPath: true, score: true },
      orderBy: { score: 'desc' },
    }),
    prisma.user.findMany({
      where:  { id: { in: friendIds } },
      select: { id: true, username: true },
    }),
  ])

  const usernameMap = new Map(friendUsers.map(u => [u.id, u.username]))

  // Aggregate by tmdbId
  interface Candidate {
    tmdbId:        number
    title:         string
    posterPath:    string | null
    friendRatings: { username: string; score: number }[]
  }

  const candidateMap = new Map<number, Candidate>()

  for (const r of friendRatings) {
    if (seenIds.has(r.tmdbId)) continue
    const username = usernameMap.get(r.userId) ?? 'friend'
    const existing = candidateMap.get(r.tmdbId)
    if (existing) {
      existing.friendRatings.push({ username, score: r.score })
    } else {
      candidateMap.set(r.tmdbId, {
        tmdbId:        r.tmdbId,
        title:         r.title,
        posterPath:    r.posterPath ?? null,
        friendRatings: [{ username, score: r.score }],
      })
    }
  }

  if (candidateMap.size === 0) return []

  // Score each candidate
  const scored: (Candidate & { matchScore: number })[] = []

  for (const candidate of candidateMap.values()) {
    const movieDNA = computeMovieVibe({
      id: candidate.tmdbId, genres: [], runtime: null,
      vote_average: 7, vote_count: 200, popularity: 50,
      release_date: '', original_language: 'en',
    })

    const dnaMatch      = dnaSimilarity(userDNA, movieDNA)
    // Bonus for multiple friends loving it (up to +20)
    const friendBonus   = Math.min(20, (candidate.friendRatings.length - 1) * 8)
    // Bonus for high average score
    const avgScore      = candidate.friendRatings.reduce((s, r) => s + r.score, 0) / candidate.friendRatings.length
    const scoreBonus    = Math.round((avgScore - FRIEND_RATING_THRESHOLD) / 20 * 10)
    const matchScore    = Math.min(100, dnaMatch + friendBonus + scoreBonus)

    scored.push({ ...candidate, matchScore })
  }

  scored.sort((a, b) => {
    // Primary: number of friends, Secondary: match score
    if (b.friendRatings.length !== a.friendRatings.length) return b.friendRatings.length - a.friendRatings.length
    return b.matchScore - a.matchScore
  })

  return scored.slice(0, limit).map(c => ({
    tmdbId:        c.tmdbId,
    title:         c.title,
    posterPath:    c.posterPath,
    matchScore:    c.matchScore,
    friendRatings: c.friendRatings.sort((a, b) => b.score - a.score).slice(0, 3),
    explanation:   buildExplanation(c.friendRatings, c.matchScore),
  }))
}

function buildExplanation(
  ratings: { username: string; score: number }[],
  matchScore: number,
): string {
  const top = ratings.sort((a, b) => b.score - a.score)
  if (ratings.length === 1) {
    return `${top[0].username} rated this ${top[0].score} · ${matchScore}% DNA match`
  }
  const names = top.slice(0, 2).map(r => r.username).join(' & ')
  return `Loved by ${names}${ratings.length > 2 ? ` +${ratings.length - 2} more` : ''} · ${matchScore}% DNA match`
}
