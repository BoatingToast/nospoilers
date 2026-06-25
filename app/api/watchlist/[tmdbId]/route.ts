import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateWatchlistItem, removeFromWatchlist } from '@/services/watchlist'

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
  const item = await updateWatchlistItem(session.user.id, tmdbId, body)
  return NextResponse.json(item)
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
