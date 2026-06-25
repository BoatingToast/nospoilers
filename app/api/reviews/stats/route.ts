import { NextRequest, NextResponse } from 'next/server'
import { getReviewStats, getUserReviewForMovie } from '@/services/reviews'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/reviews/stats?tmdbId=123
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const tmdbId  = parseInt(req.nextUrl.searchParams.get('tmdbId') ?? '', 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'tmdbId required' }, { status: 400 })

  const [stats, userReview] = await Promise.all([
    getReviewStats(tmdbId),
    session?.user?.id ? getUserReviewForMovie(session.user.id, tmdbId) : null,
  ])

  return NextResponse.json({ stats, userReview })
}
