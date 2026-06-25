import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { voteReview } from '@/services/reviews'

interface Params { params: Promise<{ reviewId: string }> }

// POST /api/reviews/[reviewId]/vote   body: { type: "upvote"|"downvote"|"helpful" }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewId } = await params
  const { type } = await req.json()

  if (!['upvote', 'downvote', 'helpful'].includes(type)) {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
  }

  const result = await voteReview(reviewId, session.user.id, type)
  return NextResponse.json(result)
}
