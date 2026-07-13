import { prisma } from '@/lib/db'
import { recalcTasteProfile } from './ratings'
import { analyzeReviewTraits } from './dna-v2'
import type { DNAScores } from '@/types'
import {
  canViewSpoilerLevel,
  classifySpoilerBoundary,
  requiredProgressForLevel,
  type PlotPassportLevel,
} from '@/lib/plot-passport'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewWithMeta {
  id:          string
  userId:      string
  username:    string
  tmdbId:      number
  movieTitle:  string
  title:       string | null
  body:        string
  rating:      number | null
  hasSpoilers: boolean
  spoilerLevel: PlotPassportLevel
  viewerUnlocked: boolean
  unlockAtProgress: number
  viewerProgress: number
  createdAt:   string
  updatedAt:   string
  upvotes:     number
  downvotes:   number
  helpfulCount: number
  replyCount:  number
  isFriend:    boolean   // populated by caller
  viewerVotes: string[]  // ["upvote","helpful",...] for the requesting user
}

export interface ReviewStats {
  total:         number
  spoilerFree:   number
  spoilerCount:  number
  avgRating:     number | null
  recommendPct:  number | null  // % of raters who gave ≥70
}

export type SortMode = 'helpful' | 'popular' | 'top' | 'newest' | 'friends'

// Backward-compatible name for callers that used the old review analyzer. DNA
// v2 returns traits on the correct 1–10 scale and applies them only during a
// complete deterministic rebuild.
export const analyzeReviewSentiment = analyzeReviewTraits

export async function applyReviewSentimentToDNA(
  userId: string,
  _sentiment: Partial<Record<keyof DNAScores, number>>,
): Promise<void> {
  await recalcTasteProfile(userId)
}

// ─── Create review ────────────────────────────────────────────────────────────

export async function createReview(
  userId:     string,
  tmdbId:     number,
  movieTitle: string,
  body:       string,
  opts: {
    title?:      string
    rating?:     number
    hasSpoilers?: boolean
    spoilerLevel?: PlotPassportLevel | 'auto'
  } = {},
): Promise<{ id: string }> {
  const spoilerLevel = classifySpoilerBoundary(
    `${opts.title ?? ''} ${body}`,
    opts.spoilerLevel === 'auto' ? undefined : opts.spoilerLevel,
    opts.hasSpoilers,
  )
  const review = await prisma.review.create({
    data: {
      userId,
      tmdbId,
      movieTitle,
      body,
      title:       opts.title      ?? null,
      rating:      opts.rating     ?? null,
      hasSpoilers: spoilerLevel !== 'safe',
      spoilerLevel,
    },
  })

  await recalcTasteProfile(userId).catch(() => {})

  return { id: review.id }
}

// ─── Update review ────────────────────────────────────────────────────────────

export async function updateReview(
  reviewId: string,
  userId:   string,
  updates: {
    title?:      string | null
    body?:       string
    rating?:     number | null
    hasSpoilers?: boolean
    spoilerLevel?: PlotPassportLevel | 'auto'
  },
): Promise<void> {
  const existing = await prisma.review.findFirst({ where: { id: reviewId, userId } })
  if (!existing) return
  const nextBody = updates.body ?? existing.body
  const nextTitle = updates.title === undefined ? existing.title : updates.title
  const spoilerLevel = classifySpoilerBoundary(
    `${nextTitle ?? ''} ${nextBody}`,
    updates.spoilerLevel === 'auto' ? undefined : updates.spoilerLevel ?? existing.spoilerLevel,
    updates.hasSpoilers ?? existing.hasSpoilers,
  )
  await prisma.review.updateMany({
    where: { id: reviewId, userId },
    data:  {
      ...(updates.title      !== undefined && { title:       updates.title }),
      ...(updates.body       !== undefined && { body:        updates.body }),
      ...(updates.rating     !== undefined && { rating:      updates.rating }),
      hasSpoilers: spoilerLevel !== 'safe',
      spoilerLevel,
    },
  })

  if (updates.body !== undefined || updates.rating !== undefined) {
    await recalcTasteProfile(userId).catch(() => {})
  }
}

// ─── Delete review ────────────────────────────────────────────────────────────

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  await prisma.review.deleteMany({ where: { id: reviewId, userId } })
  await recalcTasteProfile(userId).catch(() => {})
}

// ─── Get reviews for a movie ──────────────────────────────────────────────────

export async function getMovieReviews(
  tmdbId:      number,
  viewerId:    string | null,
  friendIds:   string[],
  sort:        SortMode = 'helpful',
  limit        = 20,
  cursor?:     string,
): Promise<ReviewWithMeta[]> {
  const viewerPassport = viewerId
    ? await prisma.watchlistItem.findUnique({
        where: { userId_tmdbId: { userId: viewerId, tmdbId } },
        select: { progressPercent: true },
      })
    : null
  const viewerProgress = viewerPassport?.progressPercent ?? 0

  // Build orderBy based on sort mode
  // For computed sorts we'll fetch more and sort in memory
  const isComputedSort = sort === 'helpful' || sort === 'popular' || sort === 'top' || sort === 'friends'

  const fetchLimit = isComputedSort ? 200 : limit

  const rows = await prisma.review.findMany({
    where: {
      tmdbId,
      ...(sort === 'friends' && friendIds.length > 0
        ? { userId: { in: friendIds } }
        : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    take: fetchLimit,
    orderBy: sort === 'newest' ? { createdAt: 'desc' } : undefined,
    include: {
      user:    { select: { id: true, username: true } },
      votes:   { select: { userId: true, type: true } },
      replies: { select: { id: true } },
    },
  })

  // Build viewer vote set
  const viewerVoteMap = new Map<string, string[]>()
  if (viewerId) {
    for (const row of rows) {
      const mine = row.votes.filter(v => v.userId === viewerId).map(v => v.type)
      viewerVoteMap.set(row.id, mine)
    }
  }

  const friendSet = new Set(friendIds)

  const mapped: ReviewWithMeta[] = rows.map(row => {
    const upvotes     = row.votes.filter(v => v.type === 'upvote').length
    const downvotes   = row.votes.filter(v => v.type === 'downvote').length
    const helpfulCount = row.votes.filter(v => v.type === 'helpful').length

    return {
      id:          row.id,
      userId:      row.userId,
      username:    row.user.username,
      tmdbId:      row.tmdbId,
      movieTitle:  row.movieTitle,
      title:       row.title,
      body:        row.body,
      rating:      row.rating,
      hasSpoilers: row.hasSpoilers,
      spoilerLevel: row.spoilerLevel as PlotPassportLevel,
      viewerUnlocked: row.userId === viewerId || canViewSpoilerLevel(row.spoilerLevel, viewerProgress),
      unlockAtProgress: requiredProgressForLevel(row.spoilerLevel),
      viewerProgress,
      createdAt:   row.createdAt.toISOString(),
      updatedAt:   row.updatedAt.toISOString(),
      upvotes,
      downvotes,
      helpfulCount,
      replyCount:  row.replies.length,
      isFriend:    friendSet.has(row.userId),
      viewerVotes: viewerVoteMap.get(row.id) ?? [],
    }
  })

  // Sort in memory for computed sorts
  if (sort === 'helpful') {
    mapped.sort((a, b) => b.helpfulCount - a.helpfulCount || b.upvotes - a.upvotes)
  } else if (sort === 'popular') {
    mapped.sort((a, b) => (b.upvotes + b.helpfulCount) - (a.upvotes + a.helpfulCount))
  } else if (sort === 'top') {
    mapped.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (sort === 'friends') {
    // Friends first, then by helpfulness
    mapped.sort((a, b) => {
      if (a.isFriend && !b.isFriend) return -1
      if (!a.isFriend && b.isFriend) return 1
      return b.helpfulCount - a.helpfulCount
    })
  }

  return mapped.slice(0, limit)
}

// ─── Get review stats for a movie ────────────────────────────────────────────

export async function getReviewStats(tmdbId: number): Promise<ReviewStats> {
  const reviews = await prisma.review.findMany({
    where:  { tmdbId },
    select: { hasSpoilers: true, rating: true },
  })

  const total        = reviews.length
  const spoilerFree  = reviews.filter(r => !r.hasSpoilers).length
  const spoilerCount = reviews.filter(r => r.hasSpoilers).length
  const rated        = reviews.filter(r => r.rating !== null)
  const avgRating    = rated.length > 0
    ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length
    : null
  const recommended  = rated.filter(r => r.rating! >= 70).length
  const recommendPct = rated.length > 0
    ? Math.round((recommended / rated.length) * 100)
    : null

  return { total, spoilerFree, spoilerCount, avgRating, recommendPct }
}

// ─── Get a user's review for a specific movie ─────────────────────────────────

export async function getUserReviewForMovie(
  userId: string, tmdbId: number,
): Promise<ReviewWithMeta | null> {
  const row = await prisma.review.findUnique({
    where:   { userId_tmdbId: { userId, tmdbId } },
    include: {
      user:    { select: { id: true, username: true } },
      votes:   { select: { userId: true, type: true } },
      replies: { select: { id: true } },
    },
  })
  if (!row) return null

  return {
    id:          row.id,
    userId:      row.userId,
    username:    row.user.username,
    tmdbId:      row.tmdbId,
    movieTitle:  row.movieTitle,
    title:       row.title,
    body:        row.body,
    rating:      row.rating,
    hasSpoilers: row.hasSpoilers,
    spoilerLevel: row.spoilerLevel as PlotPassportLevel,
    viewerUnlocked: true,
    unlockAtProgress: requiredProgressForLevel(row.spoilerLevel),
    viewerProgress: 100,
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
    upvotes:     row.votes.filter(v => v.type === 'upvote').length,
    downvotes:   row.votes.filter(v => v.type === 'downvote').length,
    helpfulCount: row.votes.filter(v => v.type === 'helpful').length,
    replyCount:  row.replies.length,
    isFriend:    false,
    viewerVotes: row.votes.filter(v => v.userId === userId).map(v => v.type),
  }
}

// ─── Vote on a review ─────────────────────────────────────────────────────────

export async function voteReview(
  reviewId: string,
  userId:   string,
  type:     'upvote' | 'downvote' | 'helpful',
): Promise<{ action: 'added' | 'removed' }> {
  const existing = await prisma.reviewVote.findUnique({
    where: { reviewId_userId_type: { reviewId, userId, type } },
  })

  if (existing) {
    await prisma.reviewVote.delete({ where: { id: existing.id } })
    return { action: 'removed' }
  }

  // If toggling upvote/downvote, remove the opposite
  if (type === 'upvote' || type === 'downvote') {
    const opposite = type === 'upvote' ? 'downvote' : 'upvote'
    await prisma.reviewVote.deleteMany({
      where: { reviewId, userId, type: opposite },
    })
  }

  await prisma.reviewVote.create({ data: { reviewId, userId, type } })
  return { action: 'added' }
}

// ─── Replies ──────────────────────────────────────────────────────────────────

export interface ReplyWithUser {
  id:        string
  userId:    string
  username:  string
  body:      string
  createdAt: string
}

export async function getReviewReplies(reviewId: string): Promise<ReplyWithUser[]> {
  const replies = await prisma.reviewReply.findMany({
    where:   { reviewId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { username: true } } },
  })
  return replies.map(r => ({
    id:        r.id,
    userId:    r.userId,
    username:  r.user.username,
    body:      r.body,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function createReviewReply(
  reviewId: string,
  userId:   string,
  body:     string,
): Promise<ReplyWithUser> {
  const reply = await prisma.reviewReply.create({
    data:    { reviewId, userId, body },
    include: { user: { select: { username: true } } },
  })
  return {
    id:        reply.id,
    userId:    reply.userId,
    username:  reply.user.username,
    body:      reply.body,
    createdAt: reply.createdAt.toISOString(),
  }
}

export async function deleteReviewReply(
  replyId: string,
  userId:  string,
): Promise<void> {
  await prisma.reviewReply.deleteMany({ where: { id: replyId, userId } })
}
