import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ reviewId: string }> }

/** Return review text only after a deliberate reveal action. */
export async function POST(_req: Request, { params }: Params) {
  const { reviewId } = await params
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { title: true, body: true },
  })
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  return NextResponse.json(review, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
