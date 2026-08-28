import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addToWatchlist, updateWatchlistItem } from '@/services/watchlist'

const VALID_FEEDBACK = new Set([
  'liked',
  'dismissed',
  'watched',
  'not_interested',
  'watchlist',
])

interface RecommendationPayload {
  tmdbId: number
  title: string
  posterPath?: string | null
  releaseDate?: string | null
  genreIds?: number[]
  voteAverage?: number | null
  matchScore?: number
  explanation?: string
}

function cleanRecommendation(value: unknown): RecommendationPayload | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const tmdbId = Number(input.tmdbId)
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 300) : ''
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !title) return null

  return {
    tmdbId,
    title,
    posterPath:  typeof input.posterPath === 'string' ? input.posterPath.slice(0, 500) : null,
    releaseDate: typeof input.releaseDate === 'string' ? input.releaseDate.slice(0, 30) : null,
    genreIds:    Array.isArray(input.genreIds)
      ? input.genreIds.map(Number).filter(Number.isInteger).slice(0, 20)
      : [],
    voteAverage: typeof input.voteAverage === 'number' && Number.isFinite(input.voteAverage)
      ? input.voteAverage
      : null,
    matchScore: typeof input.matchScore === 'number' && Number.isFinite(input.matchScore)
      ? Math.max(0, Math.min(100, Math.round(input.matchScore)))
      : 0,
    explanation: typeof input.explanation === 'string'
      ? input.explanation.trim().slice(0, 1_000)
      : 'Recommended from your Movie DNA and taste history.',
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const feedback = typeof body?.feedback === 'string' ? body.feedback : ''
  if (!VALID_FEEDBACK.has(feedback)) {
    return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
  }

  const suppliedRecommendation = cleanRecommendation(body?.recommendation)
  const legacyTmdbId = Number(body?.tmdbId)

  const recommendation = suppliedRecommendation
    ? await prisma.recommendation.upsert({
        where: {
          userId_tmdbId: { userId: session.user.id, tmdbId: suppliedRecommendation.tmdbId },
        },
        create: {
          userId:      session.user.id,
          tmdbId:      suppliedRecommendation.tmdbId,
          title:       suppliedRecommendation.title,
          posterPath:  suppliedRecommendation.posterPath ?? null,
          releaseDate: suppliedRecommendation.releaseDate ?? null,
          matchScore:  suppliedRecommendation.matchScore ?? 0,
          explanation: suppliedRecommendation.explanation ?? 'Recommended from your taste history.',
        },
        update: {
          title:       suppliedRecommendation.title,
          posterPath:  suppliedRecommendation.posterPath ?? null,
          releaseDate: suppliedRecommendation.releaseDate ?? null,
          matchScore:  suppliedRecommendation.matchScore ?? 0,
          explanation: suppliedRecommendation.explanation ?? 'Recommended from your taste history.',
        },
      })
    : Number.isInteger(legacyTmdbId) && legacyTmdbId > 0
      ? await prisma.recommendation.findUnique({
          where: { userId_tmdbId: { userId: session.user.id, tmdbId: legacyTmdbId } },
        })
      : null

  if (!recommendation) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  await prisma.recommendationFeedback.upsert({
    where:  { recommendationId: recommendation.id },
    create: { userId: session.user.id, recommendationId: recommendation.id, feedback },
    update: { feedback },
  })

  if ((feedback === 'watchlist' || feedback === 'watched') && suppliedRecommendation) {
    try {
      const existing = await prisma.watchlistItem.findUnique({
        where:  { userId_tmdbId: { userId: session.user.id, tmdbId: recommendation.tmdbId } },
        select: { status: true },
      })

      if (!existing) {
        await addToWatchlist(session.user.id, {
          tmdbId:      suppliedRecommendation.tmdbId,
          title:       suppliedRecommendation.title,
          posterPath:  suppliedRecommendation.posterPath ?? null,
          releaseDate: suppliedRecommendation.releaseDate ?? null,
          genreIds:    suppliedRecommendation.genreIds ?? [],
          voteAverage: suppliedRecommendation.voteAverage ?? null,
          matchScore:  suppliedRecommendation.matchScore ?? null,
        }, 'want_to_watch')
      }

      if (feedback === 'watched' && existing?.status !== 'watched') {
        await updateWatchlistItem(session.user.id, suppliedRecommendation.tmdbId, { status: 'watched' })
      }
    } catch {
      // Feedback is the primary action; a watchlist side effect should not undo it.
    }
  }

  return NextResponse.json({ success: true })
}
