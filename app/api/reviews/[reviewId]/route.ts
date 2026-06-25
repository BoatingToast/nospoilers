import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateReview, deleteReview } from '@/services/reviews'

interface Params { params: Promise<{ reviewId: string }> }

// PUT /api/reviews/[reviewId]
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewId } = await params
  const body = await req.json()

  await updateReview(reviewId, session.user.id, {
    title:       body.title,
    body:        body.review,
    rating:      body.rating,
    hasSpoilers: body.hasSpoilers,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/reviews/[reviewId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewId } = await params
  await deleteReview(reviewId, session.user.id)
  return NextResponse.json({ ok: true })
}
