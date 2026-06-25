import { NextResponse }             from 'next/server'
import { getServerSession }         from 'next-auth'
import { authOptions }              from '@/lib/auth'
import { prisma }                   from '@/lib/db'
import { formatMessage, MSG_INCLUDE } from '@/lib/spoiler-zone-helpers'

type Params = { params: Promise<{ tmdbId: string; messageId: string }> }

// ── PATCH /api/spoiler-zone/[tmdbId]/messages/[messageId] ──────────────────
// Body: { content: string }  — edit own message
// Returns: { message: SZMessageData }

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await params

  const existing = await prisma.spoilerZoneMessage.findUnique({ where: { id: messageId } })
  if (!existing)                              return NextResponse.json({ error: 'Not found' },         { status: 404 })
  if (existing.userId !== session.user.id)   return NextResponse.json({ error: 'Forbidden' },          { status: 403 })
  if (existing.isDeleted)                    return NextResponse.json({ error: 'Message deleted' },     { status: 400 })

  let body: { content?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const content = body.content?.trim()
  if (!content || content.length === 0) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  if (content.length > 2000)            return NextResponse.json({ error: 'Too long' },         { status: 400 })

  const updated = await prisma.spoilerZoneMessage.update({
    where:   { id: messageId },
    data:    { content, editedAt: new Date() },
    include: MSG_INCLUDE,
  })

  return NextResponse.json({ message: formatMessage(updated, session.user.id) })
}

// ── DELETE /api/spoiler-zone/[tmdbId]/messages/[messageId] ─────────────────
// Soft-deletes the message. Returns: { ok: true }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await params

  const existing = await prisma.spoilerZoneMessage.findUnique({ where: { id: messageId } })
  if (!existing)                            return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.spoilerZoneMessage.update({
    where: { id: messageId },
    data:  { isDeleted: true, content: '' },
  })

  return NextResponse.json({ ok: true })
}
