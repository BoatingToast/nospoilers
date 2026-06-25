/**
 * rec-analytics.ts
 *
 * Computes recommendation accuracy metrics from existing RecommendationFeedback rows.
 * No new schema needed — reads from the already-persisted feedback data.
 */

import { prisma } from '@/lib/db'
import type { RecAccuracy } from '@/types'

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getRecAccuracy(userId: string): Promise<RecAccuracy> {
  const feedbacks = await prisma.recommendationFeedback.findMany({
    where:  { userId },
    select: { feedback: true },
  })

  const total       = feedbacks.length
  const loved       = feedbacks.filter(f => f.feedback === 'liked').length
  const accepted    = feedbacks.filter(f => f.feedback === 'watched').length
  const dismissed   = feedbacks.filter(f => f.feedback === 'dismissed').length
  const notForMe    = feedbacks.filter(f => f.feedback === 'not_interested').length
  const accuracyPct = total === 0 ? 0 : Math.round(((loved + accepted) / total) * 100)

  return { total, loved, accepted, dismissed, notForMe, accuracyPct }
}

/** Returns the N most recent feedback items with the rec title for display */
export async function getRecentFeedback(userId: string, limit = 5) {
  const rows = await prisma.recommendationFeedback.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select: {
      id:       true,
      feedback: true,
      createdAt: true,
      recommendation: {
        select: { title: true, posterPath: true, matchScore: true, tmdbId: true },
      },
    },
  })

  return rows.map(r => ({
    id:          r.id,
    feedback:    r.feedback,
    createdAt:   r.createdAt.toISOString(),
    title:       r.recommendation.title,
    posterPath:  r.recommendation.posterPath,
    matchScore:  r.recommendation.matchScore,
    tmdbId:      r.recommendation.tmdbId,
  }))
}

/** Breakdown of how often each feedback type appears (for chart display) */
export async function getFeedbackBreakdown(userId: string) {
  const accuracy = await getRecAccuracy(userId)
  if (accuracy.total === 0) return null

  return {
    ...accuracy,
    lovedPct:     accuracy.total ? Math.round((accuracy.loved    / accuracy.total) * 100) : 0,
    acceptedPct:  accuracy.total ? Math.round((accuracy.accepted / accuracy.total) * 100) : 0,
    dismissedPct: accuracy.total ? Math.round((accuracy.dismissed/ accuracy.total) * 100) : 0,
    notForMePct:  accuracy.total ? Math.round((accuracy.notForMe / accuracy.total) * 100) : 0,
  }
}
