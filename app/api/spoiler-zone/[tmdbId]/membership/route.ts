import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'

type Params = { params: Promise<{ tmdbId: string }> }

// ── GET — check membership status for current user ────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  if (!session?.user?.id) return NextResponse.json({ isMember: false })

  const membership = await prisma.spoilerZoneMembership.findUnique({
    where: { userId_tmdbId: { userId: session.user.id, tmdbId } },
    select: { id: true, createdAt: true, lastSeenAt: true },
  })

  return NextResponse.json({ isMember: !!membership, membership })
}

// ── POST — join ───────────────────────────────────────────────────────────────
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  let body: { movieTitle?: string; moviePoster?: string }
  try { body = await req.json() } catch { body = {} }

  const movieTitle  = body.movieTitle?.trim() ?? 'Unknown Movie'
  const moviePoster = body.moviePoster?.trim() ?? null

  const membership = await prisma.spoilerZoneMembership.upsert({
    where:  { userId_tmdbId: { userId: session.user.id, tmdbId } },
    update: { lastSeenAt: new Date() },
    create: { userId: session.user.id, tmdbId, movieTitle, moviePoster },
  })

  const memberCount = await prisma.spoilerZoneMembership.count({ where: { tmdbId } })

  return NextResponse.json({ membership, memberCount }, { status: 201 })
}

// ── DELETE — leave ────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  await prisma.spoilerZoneMembership.deleteMany({
    where: { userId: session.user.id, tmdbId },
  })

  const memberCount = await prisma.spoilerZoneMembership.count({ where: { tmdbId } })
  return NextResponse.json({ ok: true, memberCount })
}

// ── PATCH — update lastSeenAt (called when user opens the room) ───────────────
export async function PATCH(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ ok: false })

  await prisma.spoilerZoneMembership.updateMany({
    where: { userId: session.user.id, tmdbId },
    data:  { lastSeenAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
