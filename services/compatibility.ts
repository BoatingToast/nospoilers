import { prisma } from '@/lib/db'
import type { DNAScores, CompatibilityResult } from '@/types'
import { getPersonalityBySlug } from './personality'
import { ratingCompatibilityScore } from './ratings'
import type { PersonalitySlug } from '@/types'

// ─── Scoring algorithm ────────────────────────────────────────────────────────
// Produces a 0–100 compatibility score from four signals:
//   DNA similarity     (0–40 pts)
//   Shared movies      (0–25 pts)
//   Shared genres      (0–20 pts)
//   Personality match  (0–15 pts)

function dnaSimilarity(a: DNAScores, b: DNAScores): number {
  const keys = Object.keys(a) as (keyof DNAScores)[]
  const totalDiff = keys.reduce((sum, k) => sum + Math.abs(a[k] - b[k]), 0)
  const maxDiff   = keys.length * 9 // max possible diff per key = 9 (10 - 1)
  return Math.round((1 - totalDiff / maxDiff) * 40)
}

function sharedMovieScore(aIds: number[], bIds: number[]): number {
  const setA  = new Set(aIds)
  const shared = bIds.filter(id => setA.has(id)).length
  // Up to 3 shared movies = full 25 pts
  return Math.min(25, Math.round((shared / 3) * 25))
}

function sharedGenreScore(aGenres: string[], bGenres: string[]): number {
  const setA  = new Set(aGenres.map(g => g.toLowerCase()))
  const shared = bGenres.filter(g => setA.has(g.toLowerCase())).length
  const union  = new Set([...aGenres, ...bGenres]).size
  if (union === 0) return 10 // both have no genres — neutral
  return Math.round((shared / union) * 20)
}

function personalityScore(aSlug: string | null, bSlug: string | null): number {
  if (!aSlug || !bSlug) return 7 // unknown → partial score
  if (aSlug === bSlug) return 15

  // Compatible pairs
  const compatible: Record<string, string[]> = {
    'thinker':        ['auteur', 'story-analyst'],
    'thriller-seeker':['auteur', 'thinker'],
    'explorer':       ['thinker', 'story-analyst', 'entertainer', 'escapist'],
    'story-analyst':  ['thinker', 'escapist', 'explorer'],
    'entertainer':    ['escapist', 'explorer'],
    'auteur':         ['thinker', 'thriller-seeker'],
    'escapist':       ['entertainer', 'story-analyst', 'explorer'],
  }
  if (compatible[aSlug]?.includes(bSlug)) return 11
  return 5
}

// ─── Reason generation ────────────────────────────────────────────────────────

function buildReasons(
  dnaA: DNAScores,
  dnaB: DNAScores,
  sharedMovieTitles: string[],
  sharedGenres: string[],
  score: number,
): string[] {
  const reasons: string[] = []
  const keys = Object.keys(dnaA) as (keyof DNAScores)[]

  const LABELS: Record<keyof DNAScores, string> = {
    suspenseScore:        'suspense & tension',
    emotionalImpactScore: 'emotional depth',
    complexityScore:      'intellectual complexity',
    humorScore:           'humor',
    realismScore:         'realism & grounded stories',
    actionScore:          'action & energy',
    darknessScore:        'dark themes',
  }

  // DNA similarities (within 1.5 points AND both are above 6.5 or below 4.5)
  for (const k of keys) {
    if (Math.abs(dnaA[k] - dnaB[k]) <= 1.5) {
      const avg = (dnaA[k] + dnaB[k]) / 2
      if (avg >= 7) reasons.push(`Shared appreciation for ${LABELS[k]}`)
      else if (avg <= 3.5) reasons.push(`You both prefer lighter, gentler ${LABELS[k]}`)
    }
  }

  if (sharedMovieTitles.length > 0) {
    reasons.push(`Both love ${sharedMovieTitles.slice(0, 2).join(' and ')}`)
  }

  if (sharedGenres.length >= 2) {
    reasons.push(`Mutual passion for ${sharedGenres.slice(0, 2).join(' and ')} films`)
  }

  if (reasons.length === 0) {
    if (score >= 60) reasons.push('Broadly compatible taste in film')
    else             reasons.push('Different but complementary film tastes')
  }

  return reasons.slice(0, 4)
}

function buildInsight(score: number, sharedMovies: number, aPersonality: string | null, bPersonality: string | null): string {
  if (score >= 90) return 'You have near-identical film taste — you\'d probably love watching movies together.'
  if (score >= 80) return 'Strong cinematic chemistry. You\'ll agree on most movie nights.'
  if (score >= 70) return 'Solid overlap in what you value in films, with just enough difference to keep things interesting.'
  if (score >= 60) return 'You share a core taste but diverge enough to introduce each other to new favorites.'
  if (score >= 45) return 'Interesting contrast — your differences could lead to great movie recommendations for each other.'
  if (sharedMovies > 0) return 'Different overall taste, but you share a few films that clearly resonated with both of you.'
  return 'Very different cinematic worlds — you could expand each other\'s horizons significantly.'
}

// ─── Main compatibility function ──────────────────────────────────────────────

export async function computeCompatibility(
  userId: string,
  targetUserId: string,
): Promise<CompatibilityResult> {
  // Check cache (< 24h old)
  const cached = await prisma.tasteCompatibility.findUnique({
    where: { userId_targetUserId: { userId, targetUserId } },
  })
  if (cached && Date.now() - cached.updatedAt.getTime() < 24 * 60 * 60 * 1000) {
    return buildResultFromCache(cached, userId, targetUserId)
  }

  // Fetch both users' data in parallel
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        tasteProfile:    true,
        onboardingMovies:{ select: { tmdbId: true, title: true, posterPath: true } },
        preferences:     { select: { genres: true } },
        personality:     { select: { primaryType: true } },
      },
    }),
    prisma.user.findUnique({
      where:  { id: targetUserId },
      select: {
        tasteProfile:    true,
        onboardingMovies:{ select: { tmdbId: true, title: true, posterPath: true } },
        preferences:     { select: { genres: true } },
        personality:     { select: { primaryType: true } },
      },
    }),
  ])

  if (!userA || !userB) throw new Error('User not found')

  const dnaA: DNAScores = userA.tasteProfile ? extractDNA(userA.tasteProfile) : neutralDNA()
  const dnaB: DNAScores = userB.tasteProfile ? extractDNA(userB.tasteProfile) : neutralDNA()

  const moviesA  = userA.onboardingMovies
  const moviesB  = userB.onboardingMovies
  const genresA  = userA.preferences?.genres ?? []
  const genresB  = userB.preferences?.genres ?? []
  const persA    = userA.personality?.primaryType ?? null
  const persB    = userB.personality?.primaryType ?? null

  const idsA = moviesA.map(m => m.tmdbId)
  const idsB = moviesB.map(m => m.tmdbId)

  const sharedMovieObjs = moviesA.filter(m => idsB.includes(m.tmdbId))
  const sharedGenreList = genresA.filter(g => genresB.map(x => x.toLowerCase()).includes(g.toLowerCase()))

  // Score components
  const dnaPts       = dnaSimilarity(dnaA, dnaB)
  const moviePts     = sharedMovieScore(idsA, idsB)
  const genrePts     = sharedGenreScore(genresA, genresB)
  const persPts      = personalityScore(persA, persB)
  // Rating-based signal: how similarly do they rate the same films? (0-15 pts)
  const { score: ratingPts } = await ratingCompatibilityScore(userId, targetUserId)
  const rawScore     = dnaPts + moviePts + genrePts + persPts + ratingPts
  const score        = Math.min(100, Math.round(rawScore))

  const reasons = buildReasons(dnaA, dnaB, sharedMovieObjs.map(m => m.title), sharedGenreList, score)
  const insight = buildInsight(score, sharedMovieObjs.length, persA, persB)

  // Persist
  await prisma.tasteCompatibility.upsert({
    where:  { userId_targetUserId: { userId, targetUserId } },
    create: { userId, targetUserId, score, reasons, insight },
    update: { score, reasons, insight, updatedAt: new Date() },
  })

  // Build DNA diff
  const dnaDiff = buildDNADiff(dnaA, dnaB)

  return {
    score,
    reasons,
    insight,
    sharedMovies: sharedMovieObjs.map(m => ({ tmdbId: m.tmdbId, title: m.title, posterPath: m.posterPath })),
    sharedGenres: sharedGenreList,
    dnaDiff,
  }
}

async function buildResultFromCache(
  cached: { score: number; reasons: unknown; insight: string; userId: string; targetUserId: string },
  userId: string,
  targetUserId: string,
): Promise<CompatibilityResult> {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { tasteProfile: true, onboardingMovies: { select: { tmdbId: true, title: true, posterPath: true } }, preferences: { select: { genres: true } } },
    }),
    prisma.user.findUnique({
      where:  { id: targetUserId },
      select: { tasteProfile: true, onboardingMovies: { select: { tmdbId: true, title: true, posterPath: true } }, preferences: { select: { genres: true } } },
    }),
  ])

  const idsB = (userB?.onboardingMovies ?? []).map(m => m.tmdbId)
  const sharedMovies = (userA?.onboardingMovies ?? []).filter(m => idsB.includes(m.tmdbId))
  const genresA = userA?.preferences?.genres ?? []
  const genresB = userB?.preferences?.genres ?? []
  const sharedGenres = genresA.filter(g => genresB.map(x => x.toLowerCase()).includes(g.toLowerCase()))

  const dnaA = userA?.tasteProfile ? extractDNA(userA.tasteProfile) : neutralDNA()
  const dnaB = userB?.tasteProfile ? extractDNA(userB.tasteProfile) : neutralDNA()

  return {
    score:        cached.score,
    reasons:      cached.reasons as string[],
    insight:      cached.insight,
    sharedMovies: sharedMovies.map(m => ({ tmdbId: m.tmdbId, title: m.title, posterPath: m.posterPath })),
    sharedGenres,
    dnaDiff:      buildDNADiff(dnaA, dnaB),
  }
}

// ─── Find similar users ───────────────────────────────────────────────────────

export async function findSimilarUsers(userId: string, limit = 6) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      onboardingMovies: { select: { tmdbId: true } },
      tasteProfile:     true,
      personality:      { select: { primaryType: true } },
      following:        { select: { followingId: true } },
    },
  })
  if (!user) return []

  const myMovieIds   = user.onboardingMovies.map(m => m.tmdbId)
  const myPersonality = user.personality?.primaryType ?? null
  const followingIds  = new Set(user.following.map(f => f.followingId))

  // Find users who share movies, same/compatible personality, excluding self and already-following
  const candidates = await prisma.user.findMany({
    where: {
      id:                 { not: userId },
      onboardingCompleted: true,
      onboardingMovies:   { some: { tmdbId: { in: myMovieIds } } },
    },
    select: {
      id: true, username: true, avatarUrl: true,
      onboardingMovies: { select: { tmdbId: true } },
      personality:      { select: { primaryType: true } },
      followers:        { select: { followerId: true } },
    },
    take: 30,
  })

  // Score each candidate
  const scored = candidates.map(candidate => {
    const theirIds    = candidate.onboardingMovies.map(m => m.tmdbId)
    const sharedCount = theirIds.filter(id => myMovieIds.includes(id)).length
    const persSame    = myPersonality && candidate.personality?.primaryType === myPersonality ? 10 : 0
    const score       = sharedCount * 15 + persSame

    return {
      id:            candidate.id,
      username:      candidate.username,
      avatarUrl:     candidate.avatarUrl ?? null,
      personality:   candidate.personality?.primaryType
                       ? { slug: candidate.personality.primaryType as PersonalitySlug, ...({} as any) }
                       : null,
      compatScore:   Math.min(99, score + 40), // estimated
      sharedMovies:  sharedCount,
      followerCount: candidate.followers.length,
      isFollowing:   followingIds.has(candidate.id),
    }
  }).sort((a, b) => b.sharedMovies - a.sharedMovies || b.compatScore - a.compatScore)
    .slice(0, limit)

  return scored
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDNA(profile: {
  suspenseScore: number; emotionalImpactScore: number; complexityScore: number
  humorScore: number; realismScore: number; actionScore: number; darknessScore: number
}): DNAScores {
  return {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }
}

function neutralDNA(): DNAScores {
  return { suspenseScore: 5, emotionalImpactScore: 5, complexityScore: 5, humorScore: 5, realismScore: 5, actionScore: 5, darknessScore: 5 }
}

function buildDNADiff(a: DNAScores, b: DNAScores): CompatibilityResult['dnaDiff'] {
  const result = {} as CompatibilityResult['dnaDiff']
  for (const key of Object.keys(a) as (keyof DNAScores)[]) {
    result[key] = { you: a[key], them: b[key], diff: parseFloat((a[key] - b[key]).toFixed(1)) }
  }
  return result
}
