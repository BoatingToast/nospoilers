import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRating, deleteRating } from '@/services/ratings'

type Ctx = { params: Promise<{ tmdbId: string }> }

// GET /api/ratings/[tmdbId] — get the current user's rating for one movie
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  const rating = await getRating(session.user.id, id)
  return NextResponse.json({ rating })
}

// DELETE /api/ratings/[tmdbId] — remove a rating
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId } = await params
  const id = parseInt(tmdbId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  await deleteRating(session.user.id, id)
  return NextResponse.json({ success: true })
}
