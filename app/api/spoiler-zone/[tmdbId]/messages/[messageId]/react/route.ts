import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'
import type { SZReactionGroup } from '@/types'

type Params = { params: Promise<{ tmdbId: string; messageId: string }> }

const ALLOWED_EMOJI = ['🔥', '💀', '🤯', '😭', '👀', '❤️', '👏', '🎬']

// ── POST /api/spoiler-zone/[tmdbId]/messages/[messageId]/react ─────────────
// Body: { emoji: string }  — toggle reaction on/off
// Returns: { reactions: SZReactionGroup[] }

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await params
  const msg = await prisma.spoilerZoneMessage.findUnique({ where: { id: messageId } })
  if (!msg || msg.isDeleted) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  let body: { emoji?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const emoji = body.emoji?.trim()
  if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  const userId = session.user.id

  // Toggle: upsert or delete
  const existing = await prisma.spoilerZoneReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  })

  if (existing) {
    await prisma.spoilerZoneReaction.delete({ where: { id: existing.id } })
  } else {
    await prisma.spoilerZoneReaction.create({ data: { messageId, userId, emoji } })
  }

  // Return updated grouped reactions
  const allReactions = await prisma.spoilerZoneReaction.findMany({
    where:  { messageId },
    select: { emoji: true, userId: true },
  })

  const map = new Map<string, { count: number; userReacted: boolean }>()
  for (const r of allReactions) {
    const prev = map.get(r.emoji) ?? { count: 0, userReacted: false }
    map.set(r.emoji, { count: prev.count + 1, userReacted: prev.userReacted || r.userId === userId })
  }
  const reactions: SZReactionGroup[] = Array.from(map.entries())
    .map(([e, d]) => ({ emoji: e, count: d.count, userReacted: d.userReacted }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ reactions })
}
