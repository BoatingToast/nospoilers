import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { upsertRating, getUserRatings, getRatingStats } from '@/services/ratings'

// GET /api/ratings?page=1&limit=20&sort=date|score&stats=true
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statsOnly = searchParams.get('stats') === 'true'

  if (statsOnly) {
    const stats = await getRatingStats(session.user.id)
    return NextResponse.json({ stats })
  }

  const page   = parseInt(searchParams.get('page')  ?? '1',  10)
  const limit  = parseInt(searchParams.get('limit') ?? '20', 10)
  const sortBy = (searchParams.get('sort') ?? 'date') as 'date' | 'score'

  const result = await getUserRatings(session.user.id, { page, limit, sortBy })
  return NextResponse.json(result)
}

// POST /api/ratings — create or update a rating
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    tmdbId, title, posterPath, releaseDate, score,
    storytelling, characters, entertainment, emotion, complexity, suspense,
    review,
  } = body

  if (!tmdbId || typeof score !== 'number' || score < 1 || score > 100) {
    return NextResponse.json(
      { error: 'tmdbId and score (1–100) are required' },
      { status: 400 },
    )
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Dimension ratings are 1–10 each and entirely optional
  const dimKeys = ['storytelling', 'characters', 'entertainment', 'emotion', 'complexity', 'suspense']
  for (const key of dimKeys) {
    const val = body[key]
    if (val !== null && val !== undefined && (typeof val !== 'number' || val < 1 || val > 10)) {
      return NextResponse.json({ error: `${key} must be between 1–10` }, { status: 400 })
    }
  }

  const rating = await upsertRating(session.user.id, {
    tmdbId, title,
    posterPath:   posterPath   ?? null,
    releaseDate:  releaseDate  ?? null,
    score,
    storytelling, characters, entertainment, emotion, complexity, suspense,
    review,
  })

  return NextResponse.json({ rating })
}
