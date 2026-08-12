import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
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

  try {
    const body = (await req.json()) as Record<string, unknown>

    const tmdbId = Number(body.tmdbId)
    const score = Number(body.score)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const { posterPath, releaseDate, review, genreIds, runtime, voteAverage, voteCount, popularity, originalLanguage, budget, keywords } = body
    const storytelling = body.storytelling
    const characters = body.characters
    const entertainment = body.entertainment
    const emotion = body.emotion
    const complexity = body.complexity
    const suspense = body.suspense

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: 'tmdbId must be a positive integer' }, { status: 400 })
    }
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      return NextResponse.json({ error: 'score must be a number from 1 to 100' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Dimension ratings are 1–10 each and entirely optional
    const dimKeys = ['storytelling', 'characters', 'entertainment', 'emotion', 'complexity', 'suspense'] as const
    for (const key of dimKeys) {
      const val = body[key]
      const parsed = typeof val === 'string' ? Number(val) : val
      if (parsed !== null && parsed !== undefined && (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 1 || parsed > 10)) {
        return NextResponse.json({ error: `${key} must be between 1–10` }, { status: 400 })
      }
    }

    const rating = await upsertRating(session.user.id, {
      tmdbId,
      title,
      posterPath: typeof posterPath === 'string' || posterPath === null ? (posterPath ?? null) : null,
      releaseDate: typeof releaseDate === 'string' ? releaseDate : null,
      score,
      storytelling: storytelling === null || storytelling === undefined ? null : Number(storytelling),
      characters: characters === null || characters === undefined ? null : Number(characters),
      entertainment: entertainment === null || entertainment === undefined ? null : Number(entertainment),
      emotion: emotion === null || emotion === undefined ? null : Number(emotion),
      complexity: complexity === null || complexity === undefined ? null : Number(complexity),
      suspense: suspense === null || suspense === undefined ? null : Number(suspense),
      review: typeof review === 'string' ? review.trim() || null : null,
      genreIds: Array.isArray(genreIds)
        ? (genreIds as unknown[]).map(value => Number(value)).filter((value): value is number => Number.isInteger(value))
        : undefined,
      runtime: typeof runtime === 'number' && Number.isFinite(runtime) ? runtime : null,
      voteAverage: typeof voteAverage === 'number' && Number.isFinite(voteAverage) ? voteAverage : null,
      voteCount: typeof voteCount === 'number' && Number.isFinite(voteCount) ? voteCount : null,
      popularity: typeof popularity === 'number' && Number.isFinite(popularity) ? popularity : null,
      originalLanguage: typeof originalLanguage === 'string' ? originalLanguage : null,
      budget: typeof budget === 'number' && Number.isFinite(budget) ? budget : null,
      keywords: Array.isArray(keywords)
        ? (keywords as unknown[]).filter((value): value is string => typeof value === 'string')
        : undefined,
    })

    return NextResponse.json({ rating })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[ratings] prisma error', {
        code: error.code,
        meta: error.meta,
        userId: session?.user?.id ?? 'unknown',
      })
      return NextResponse.json({ error: 'Could not save your rating due to a database error.' }, { status: 500 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    console.error('[ratings] save failed', error)
    return NextResponse.json({ error: 'Could not save your rating right now. Please try again.' }, { status: 500 })
  }
}
