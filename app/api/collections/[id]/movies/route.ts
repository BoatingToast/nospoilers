
/**
 * POST   /api/collections/[id]/movies  — add a movie (owner only)
 * DELETE /api/collections/[id]/movies?tmdbId=X  — remove a movie (owner only)
 * PATCH  /api/collections/[id]/movies  — reorder movies (owner only)
 *   body: { positions: { tmdbId: number; position: number }[] }
 */

import { NextRequest, NextResponse }                              from 'next/server'
import { getServerSession }                                      from 'next-auth'
import { authOptions }                                           from '@/lib/auth'
import { addMovieToCollection, removeMovieFromCollection }        from '@/services/collections'
import { prisma }                                                from '@/lib/db'
type Ctx = { params: Promise<{ id: string }> }

// ── Shared ownership guard ────────────────────────────────────────────────────

async function assertOwner(req: NextRequest, collectionId: string): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const userId  = session?.user?.id
  if (!userId) return null

  const col = await prisma.collection.findUnique({
    where:  { id: collectionId },
    select: { userId: true },
  })
  if (!col || col.userId !== userId) return null
  return userId
}

// ── POST — add movie ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: collectionId } = await params
  const userId = await assertOwner(req, collectionId)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { tmdbId?: unknown; title?: unknown; posterPath?: unknown; releaseDate?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const tmdbId      = typeof body.tmdbId === 'number' ? body.tmdbId : parseInt(String(body.tmdbId ?? ''), 10)
  const title       = typeof body.title === 'string' ? body.title.trim() : ''
  const posterPath  = typeof body.posterPath === 'string' ? body.posterPath : null
  const releaseDate = typeof body.releaseDate === 'string' ? body.releaseDate : null

  if (!tmdbId || isNaN(tmdbId) || !title)
    return NextResponse.json({ error: 'tmdbId and title are required' }, { status: 400 })

  // Assign position = max existing + 1
  const maxPos = await prisma.collectionMovie.aggregate({
    where:   { collectionId },
    _max:    { position: true },
  })
  const position = (maxPos._max.position ?? -1) + 1

  try {
    await addMovieToCollection(collectionId, { tmdbId, title, posterPath, releaseDate, position })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[collections/movies POST]', err)
    return NextResponse.json({ error: 'Failed to add movie' }, { status: 500 })
  }
}

// ── PATCH — reorder movies ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id: collectionId } = await params
  const userId = await assertOwner(req, collectionId)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { positions?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const positions = body.positions
  if (!Array.isArray(positions))
    return NextResponse.json({ error: 'positions array required' }, { status: 400 })

  // Update each movie's position in a transaction
  await prisma.$transaction(
    (positions as { tmdbId: number; position: number }[]).map(({ tmdbId, position }) =>
      prisma.collectionMovie.updateMany({
        where: { collectionId, tmdbId },
        data:  { position },
      })
    )
  )

  // Refresh collection updatedAt
  await prisma.collection.update({
    where: { id: collectionId },
    data:  { updatedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}

// ── DELETE — remove movie ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id: collectionId } = await params
  const userId = await assertOwner(req, collectionId)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tmdbId = parseInt(new URL(req.url).searchParams.get('tmdbId') ?? '', 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  try {
    await removeMovieFromCollection(collectionId, tmdbId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[collections/movies DELETE]', err)
    return NextResponse.json({ error: 'Failed to remove movie' }, { status: 500 })
  }
}
