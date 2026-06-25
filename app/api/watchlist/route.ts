import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist, addToWatchlist, getWatchlistStats } from '@/services/watchlist'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status  = searchParams.get('status') as any ?? undefined
  const sortBy  = searchParams.get('sortBy') ?? 'addedAt'
  const withStats = searchParams.get('stats') === 'true'

  const [items, stats] = await Promise.all([
    getWatchlist(session.user.id, { status, sortBy }),
    withStats ? getWatchlistStats(session.user.id) : null,
  ])

  return NextResponse.json({ items, stats })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { tmdbId, title, posterPath, releaseDate, genreIds, runtime, voteAverage, matchScore, status } = body
    if (!tmdbId || !title) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const item = await addToWatchlist(session.user.id, {
      tmdbId, title, posterPath, releaseDate, genreIds: genreIds ?? [],
      runtime, voteAverage, matchScore,
    }, status ?? 'want_to_watch')

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}
