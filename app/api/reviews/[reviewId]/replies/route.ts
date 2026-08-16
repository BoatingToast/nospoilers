import { NextRequest, NextResponse }   from 'next/server'
import { getToken }                    from '@/lib/get-auth-token'
import { getReviewReplies, createReviewReply } from '@/services/reviews'
import { notifyReviewReply }           from '@/services/notifications'
import { prisma }                      from '@/lib/db'
import { canViewSpoilerLevel }         from '@/lib/plot-passport'
import { enforceRateLimit }            from '@/lib/rate-limit'

interface Params { params: Promise<{ reviewId: string }> }

// GET /api/reviews/[reviewId]/replies
export async function GET(req: NextRequest, { params }: Params) {
  const { reviewId } = await params
  const token = await getToken({ req })
  const viewerId = token?.id as string | undefined
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { tmdbId: true, userId: true, spoilerLevel: true },
  })
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  const passport = viewerId
    ? await prisma.watchlistItem.findUnique({
        where: { userId_tmdbId: { userId: viewerId, tmdbId: review.tmdbId } },
        select: { progressPercent: true },
      })
    : null
  const explicitlyRevealed = req.nextUrl.searchParams.get('reveal') === '1'
  const unlocked = explicitlyRevealed || review.userId === viewerId ||
    canViewSpoilerLevel(review.spoilerLevel, passport?.progressPercent ?? 0)
  if (!unlocked) {
    return NextResponse.json({ error: 'Review is locked by Plot Passport' }, { status: 403 })
  }

  const replies = await getReviewReplies(reviewId)
  return NextResponse.json({ replies }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

// POST /api/reviews/[reviewId]/replies   body: { body: string }
export async function POST(req: NextRequest, { params }: Params) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myId = token.id as string
  const limited = await enforceRateLimit(req, {
    scope: 'review-reply',
    identifier: `user:${myId}`,
    limit: 20,
    windowMs: 60 * 1000,
  })
  if (limited) return limited
  const { reviewId } = await params
  const { body } = await req.json()

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Reply body required' }, { status: 400 })
  }

  const reply = await createReviewReply(reviewId, myId, body.trim())

  // Finish saving the notification before the request ends. Fire-and-forget
  // database work can be terminated early by serverless runtimes.
  const review = await prisma.review.findUnique({
    where:  { id: reviewId },
    select: { userId: true, tmdbId: true, movieTitle: true },
  })
  if (review && review.userId !== myId) {
    await notifyReviewReply(review.userId, myId, review.tmdbId, review.movieTitle ?? 'a movie')
  }

  return NextResponse.json(reply, { status: 201 })
}
