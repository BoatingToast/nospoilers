import { NextRequest, NextResponse }   from 'next/server'
import { getToken }                    from 'next-auth/jwt'
import { getReviewReplies, createReviewReply } from '@/services/reviews'
import { notifyReviewReply }           from '@/services/notifications'
import { prisma }                      from '@/lib/db'

interface Params { params: Promise<{ reviewId: string }> }

// GET /api/reviews/[reviewId]/replies
export async function GET(_req: NextRequest, { params }: Params) {
  const { reviewId } = await params
  const replies = await getReviewReplies(reviewId)
  return NextResponse.json({ replies })
}

// POST /api/reviews/[reviewId]/replies   body: { body: string }
export async function POST(req: NextRequest, { params }: Params) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myId = token.id as string
  const { reviewId } = await params
  const { body } = await req.json()

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Reply body required' }, { status: 400 })
  }

  const reply = await createReviewReply(reviewId, myId, body.trim())

  // Notify the review author (non-blocking)
  void prisma.review.findUnique({
    where:  { id: reviewId },
    select: { userId: true, tmdbId: true, movieTitle: true },
  }).then(review => {
    if (review && review.userId !== myId) {
      notifyReviewReply(review.userId, myId, review.tmdbId, review.movieTitle ?? 'a movie').catch(() => {})
    }
  })

  return NextResponse.json(reply, { status: 201 })
}
