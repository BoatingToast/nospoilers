import { prisma } from '@/lib/db'
import type { EnrichedCollectionData, VoteType, CreatorAnalytics, CollectionSuggestion } from '@/types'

// ─── Shared include helper ────────────────────────────────────────────────────

function buildInclude(userId?: string) {
  return {
    analytics: true,
    movies:    { take: 5, orderBy: { addedAt: 'asc' as const } },
    user:      { select: { username: true } },
    ...(userId ? { votes: { where: { userId } } } : {}),
  } as const
}

// ─── Trending (Wilson score + recency boost) ──────────────────────────────────

export async function getTrendingCollections(
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  // Pull the top-scored by analytics, then boost recent activity in JS
  const rows = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: buildInclude(userId),
    orderBy: [
      { analytics: { popularityScore: 'desc' } },
      { updatedAt: 'desc' },
    ],
    take: limit * 2,   // over-fetch so we can re-rank
  })

  // Recency boost: collections updated in the last 7 days get +10 pts
  const now = Date.now()
  const ranked = rows
    .map(r => {
      const base      = r.analytics?.popularityScore ?? 0
      const ageMs     = now - r.updatedAt.getTime()
      const ageDays   = ageMs / 86_400_000
      const freshBonus = ageDays < 7 ? (7 - ageDays) * 1.5 : 0
      return { row: r, trendScore: base + freshBonus }
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit)

  return ranked.map(({ row }) => toEnriched(row, userId))
}

// ─── Popular (net score) ──────────────────────────────────────────────────────

export async function getPopularCollections(
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const rows = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: buildInclude(userId),
    orderBy: [
      { analytics: { score:  'desc' } },
      { analytics: { upvotes: 'desc' } },
      { updatedAt: 'desc' },
    ],
    take: limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Newest ───────────────────────────────────────────────────────────────────

export async function getNewestCollections(
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const rows = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: buildInclude(userId),
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Most-upvoted ─────────────────────────────────────────────────────────────

export async function getMostUpvotedCollections(
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const rows = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: buildInclude(userId),
    orderBy: { analytics: { upvotes: 'desc' } },
    take:    limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Following (collections by people you follow) ─────────────────────────────

export async function getFollowingCollections(
  userId: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const following = await prisma.userFollow.findMany({
    where:  { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = following.map(f => f.followingId)
  if (followingIds.length === 0) return []

  const rows = await prisma.collection.findMany({
    where:   { isPublic: true, userId: { in: followingIds } },
    include: buildInclude(userId),
    orderBy: { updatedAt: 'desc' },
    take:    limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Most-movies sort ─────────────────────────────────────────────────────────

export async function getMostMoviesCollections(
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const rows = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: buildInclude(userId),
    orderBy: { updatedAt: 'desc' },
    take:    limit * 3,
  })
  return rows
    .sort((a, b) => b.movies.length - a.movies.length)
    .slice(0, limit)
    .map(r => toEnriched(r, userId))
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchCollections(
  query:  string,
  userId?: string,
  limit  = 24,
): Promise<EnrichedCollectionData[]> {
  const q = query.trim()
  if (!q) return []

  const rows = await prisma.collection.findMany({
    where: {
      isPublic: true,
      OR: [
        { title:       { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { user:   { username: { contains: q, mode: 'insensitive' } } },
        { movies: { some: { title: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: buildInclude(userId),
    orderBy: [
      { analytics: { score:  'desc' } },
      { updatedAt: 'desc' },
    ],
    take: limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Autocomplete suggestions ─────────────────────────────────────────────────

export async function getCollectionSuggestions(
  query: string,
  limit = 6,
): Promise<CollectionSuggestion[]> {
  const q = query.trim()
  if (!q) return []

  const rows = await prisma.collection.findMany({
    where: {
      isPublic: true,
      title:    { contains: q, mode: 'insensitive' },
    },
    select: {
      id:        true,
      title:     true,
      user:      { select: { username: true } },
      analytics: { select: { score: true } },
    },
    orderBy: { analytics: { score: 'desc' } },
    take:    limit,
  })

  return rows.map(r => ({ id: r.id, title: r.title, username: r.user.username }))
}

// ─── Related collections (movie-overlap) ─────────────────────────────────────

export async function getRelatedCollections(
  collectionId: string,
  userId?:      string,
  limit        = 4,
): Promise<EnrichedCollectionData[]> {
  const source = await prisma.collection.findUnique({
    where:   { id: collectionId },
    include: { movies: { select: { tmdbId: true } } },
  })
  if (!source || source.movies.length === 0) return []

  const tmdbIds = source.movies.map(m => m.tmdbId)

  const rows = await prisma.collection.findMany({
    where: {
      isPublic: true,
      id:       { not: collectionId },
      movies:   { some: { tmdbId: { in: tmdbIds } } },
    },
    include: buildInclude(userId),
    orderBy: { analytics: { score: 'desc' } },
    take:    limit,
  })
  return rows.map(r => toEnriched(r, userId))
}

// ─── Collection analytics for the creator ────────────────────────────────────

export async function getCreatorAnalytics(userId: string): Promise<CreatorAnalytics> {
  const collections = await prisma.collection.findMany({
    where:   { userId },
    include: {
      analytics: true,
      movies:    true,
    },
    orderBy: { analytics: { score: 'desc' } },
  })

  const totalUpvotes   = collections.reduce((s, c) => s + (c.analytics?.upvotes   ?? 0), 0)
  const totalDownvotes = collections.reduce((s, c) => s + (c.analytics?.downvotes ?? 0), 0)
  const totalViews     = collections.reduce((s, c) => s + (c.analytics?.views     ?? 0), 0)
  const netScore       = totalUpvotes - totalDownvotes

  const topCollections = [...collections]
    .sort((a, b) => (b.analytics?.score ?? 0) - (a.analytics?.score ?? 0))
    .slice(0, 5)
    .map(c => ({
      id:         c.id,
      title:      c.title,
      upvotes:    c.analytics?.upvotes   ?? 0,
      score:      c.analytics?.score     ?? 0,
      movieCount: c.movies.length,
    }))

  // Most-included movies across all collections
  const movieMap = new Map<number, { title: string; posterPath: string | null; count: number }>()
  for (const col of collections) {
    for (const m of col.movies) {
      const entry = movieMap.get(m.tmdbId)
      if (entry) entry.count++
      else movieMap.set(m.tmdbId, { title: m.title, posterPath: m.posterPath, count: 1 })
    }
  }
  const topMovies = [...movieMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([tmdbId, data]) => ({ tmdbId, ...data }))

  return {
    totalCollections: collections.length,
    totalUpvotes,
    totalDownvotes,
    totalViews,
    netScore,
    topCollections,
    topMovies,
  }
}

// ─── Helper: raw Prisma row → EnrichedCollectionData ─────────────────────────

type CollectionRow = {
  id:          string
  userId:      string
  title:       string
  description: string | null
  coverPath:   string | null
  isPublic:    boolean
  createdAt:   Date
  updatedAt:   Date
  movies: {
    id:          string
    tmdbId:      number
    title:       string
    posterPath:  string | null
    releaseDate: string | null
    addedAt:     Date
    position:    number
  }[]
  user:      { username: string }
  analytics: {
    upvotes:         number
    downvotes:       number
    score:           number
    popularityScore: number
    views:           number
    saves:           number
  } | null
  votes?: { voteType: string }[]
}

export function toEnriched(
  c:      CollectionRow,
  userId?: string,
): EnrichedCollectionData {
  void userId   // userId resolved at query time via `where: { userId }` filter
  return {
    id:              c.id,
    userId:          c.userId,
    username:        c.user.username,
    title:           c.title,
    description:     c.description,
    coverPath:       c.coverPath ?? c.movies[0]?.posterPath ?? null,
    isPublic:        c.isPublic,
    movieCount:      c.movies.length,
    movies:          c.movies.map(m => ({
      id:          m.id,
      tmdbId:      m.tmdbId,
      title:       m.title,
      posterPath:  m.posterPath,
      releaseDate: m.releaseDate,
      addedAt:     m.addedAt.toISOString(),
      position:    m.position,
    })),
    createdAt:       c.createdAt.toISOString(),
    upvotes:         c.analytics?.upvotes         ?? 0,
    downvotes:       c.analytics?.downvotes       ?? 0,
    score:           c.analytics?.score           ?? 0,
    popularityScore: c.analytics?.popularityScore ?? 0,
    views:           c.analytics?.views           ?? 0,
    userVote:        (c.votes?.[0]?.voteType as VoteType) ?? null,
  }
}
