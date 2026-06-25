import { prisma } from '@/lib/db'
import type { VoteType, VoteResult } from '@/types'

// ─── Cast / change a vote ─────────────────────────────────────────────────────

export async function castVote(
  userId:       string,
  collectionId: string,
  voteType:     VoteType,
): Promise<VoteResult> {
  // Verify collection exists + owner check
  const col = await prisma.collection.findUnique({
    where:  { id: collectionId },
    select: { userId: true },
  })
  if (!col) throw new Error('Collection not found')
  if (col.userId === userId) throw new Error('Cannot vote on your own collection')

  await prisma.collectionVote.upsert({
    where:  { userId_collectionId: { userId, collectionId } },
    create: { userId, collectionId, voteType },
    update: { voteType },
  })

  const stats = await recalcAnalytics(collectionId)
  return { ...stats, userVote: voteType }
}

// ─── Remove a vote ────────────────────────────────────────────────────────────

export async function removeVote(
  userId:       string,
  collectionId: string,
): Promise<VoteResult> {
  await prisma.collectionVote.deleteMany({ where: { userId, collectionId } })
  const stats = await recalcAnalytics(collectionId)
  return { ...stats, userVote: null }
}

// ─── Get the viewing user's current vote ─────────────────────────────────────

export async function getUserVote(
  userId:       string,
  collectionId: string,
): Promise<VoteType | null> {
  const row = await prisma.collectionVote.findUnique({
    where:  { userId_collectionId: { userId, collectionId } },
    select: { voteType: true },
  })
  return (row?.voteType as VoteType) ?? null
}

// ─── Recalculate + persist analytics ─────────────────────────────────────────

export async function recalcAnalytics(collectionId: string) {
  const [upvotes, downvotes] = await Promise.all([
    prisma.collectionVote.count({ where: { collectionId, voteType: 'upvote'   } }),
    prisma.collectionVote.count({ where: { collectionId, voteType: 'downvote' } }),
  ])

  const score           = upvotes - downvotes
  const popularityScore = wilsonScore(upvotes, downvotes)

  await prisma.collectionAnalytics.upsert({
    where:  { collectionId },
    create: { collectionId, upvotes, downvotes, score, popularityScore },
    update: { upvotes, downvotes, score, popularityScore },
  })

  return { upvotes, downvotes, score }
}

// ─── Track a view ─────────────────────────────────────────────────────────────

export async function trackView(collectionId: string): Promise<void> {
  await prisma.collectionAnalytics.upsert({
    where:  { collectionId },
    create: { collectionId, views: 1 },
    update: { views: { increment: 1 } },
  }).catch(() => {}) // never throw — fire-and-forget
}

// ─── Wilson score lower bound (one-sided, 95 % confidence) ───────────────────
// Returns a 0–100 float — higher means more confident popularity.

function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0
  const z    = 1.645                  // 95 % z-score
  const phat = upvotes / n
  const discriminant = (phat * (1 - phat) + (z * z) / (4 * n)) / n
  const lower = (phat + (z * z) / (2 * n) - z * Math.sqrt(discriminant)) / (1 + (z * z) / n)
  return Math.round(lower * 1000) / 10  // 0–100, one decimal place
}
