/**
 * PATCH /api/user/spoiler-zones/[tmdbId]
 *   Body: { action: 'pin' | 'unpin' | 'mute' | 'unmute' | 'mark_read' }
 *
 * DELETE /api/user/spoiler-zones/[tmdbId]
 *   Leave the Spoiler Zone (same as DELETE /api/spoiler-zone/[tmdbId]/membership)
 */

import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'

type Params = { params: Promise<{ tmdbId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  let body: { action?: string }
  try { body = await req.json() } catch { body = {} }

  const action = body.action

  let data: Record<string, unknown> = {}

  switch (action) {
    case 'pin':
      data = { pinned: true, pinnedAt: new Date() }
      break
    case 'unpin':
      data = { pinned: false, pinnedAt: null }
      break
    case 'mute':
      data = { notificationsEnabled: false }
      break
    case 'unmute':
      data = { notificationsEnabled: true }
      break
    case 'mark_read':
      data = { lastSeenAt: new Date() }
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  await prisma.spoilerZoneMembership.updateMany({
    where: { userId: session.user.id, tmdbId },
    data,
  })

  return NextResponse.json({ ok: true })
}

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
