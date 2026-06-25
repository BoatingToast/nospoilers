import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getMovieReviews, createReview,
  type SortMode,
} from '@/services/reviews'
import { getFriendIds } from '@/services/friends'

// GET /api/reviews?tmdbId=123&sort=helpful&limit=20&cursor=xxx
export async function GET(req: NextRequest) {
  const session   = await getServerSession(authOptions)
  const { searchParams } = req.nextUrl

  const tmdbId = parseInt(searchParams.get('tmdbId') ?? '', 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'tmdbId required' }, { status: 400 })

  const sort   = (searchParams.get('sort') ?? 'helpful') as SortMode
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const cursor = searchParams.get('cursor') ?? undefined

  const viewerId  = session?.user?.id ?? null
  const friendIds = viewerId ? await getFriendIds(viewerId) : []

  const reviews = await getMovieReviews(tmdbId, viewerId, friendIds, sort, limit, cursor)
  return NextResponse.json({ reviews })
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tmdbId, movieTitle, title, review: reviewBody, rating, hasSpoilers } = body

  if (!tmdbId || !movieTitle || !reviewBody?.trim()) {
    return NextResponse.json({ error: 'tmdbId, movieTitle and review body required' }, { status: 400 })
  }

  if (rating !== undefined && rating !== null && (rating < 1 || rating > 100)) {
    return NextResponse.json({ error: 'rating must be 1-100' }, { status: 400 })
  }

  try {
    const result = await createReview(
      session.user.id,
      parseInt(tmdbId, 10),
      movieTitle,
      reviewBody.trim(),
      { title: title?.trim() || undefined, rating: rating ?? undefined, hasSpoilers: hasSpoilers ?? false },
    )
    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    // Unique constraint = already reviewed
    if ((e as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'You have already reviewed this movie' }, { status: 409 })
    }
    throw e
  }
}
