import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlistItem, updateWatchlistItem, removeFromWatchlist } from '@/services/watchlist'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: raw } = await params
  const tmdbId = parseInt(raw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const item = await getWatchlistItem(session.user.id, tmdbId)
  return NextResponse.json({ status: item?.status ?? null })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: raw } = await params
  const tmdbId = parseInt(raw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json()
  const validStatuses = new Set(['want_to_watch', 'watching', 'watched'])
  if (body.status !== undefined && !validStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid watch status' }, { status: 400 })
  }
  if (body.progressPercent !== undefined &&
      (!Number.isFinite(Number(body.progressPercent)) || Number(body.progressPercent) < 0 || Number(body.progressPercent) > 100)) {
    return NextResponse.json({ error: 'Progress must be between 0 and 100' }, { status: 400 })
  }
  for (const field of ['currentSeason', 'currentEpisode'] as const) {
    if (body[field] !== undefined && body[field] !== null &&
        (!Number.isFinite(Number(body[field])) || Number(body[field]) < 1)) {
      return NextResponse.json({ error: `${field} must be a positive number` }, { status: 400 })
    }
  }

  try {
    const item = await updateWatchlistItem(session.user.id, tmdbId, {
      status: body.status,
      progressPercent: body.progressPercent,
      currentSeason: body.currentSeason,
      currentEpisode: body.currentEpisode,
      rating: body.rating,
      notes: body.notes,
      rewatchCount: body.rewatchCount,
    })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof Error && error.message === 'Watchlist item not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: raw } = await params
  const tmdbId = parseInt(raw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await removeFromWatchlist(session.user.id, tmdbId)
  return NextResponse.json({ success: true })
}
