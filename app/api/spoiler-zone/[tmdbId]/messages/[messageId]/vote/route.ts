import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'

type Params = { params: Promise<{ tmdbId: string; messageId: string }> }

// ── POST /api/spoiler-zone/[tmdbId]/messages/[messageId]/vote ──────────────
// Body: { type: "upvote" | "downvote" }
// Toggling the same vote removes it. Switching vote reverses.
// Returns: { voteScore: number; userVote: "upvote" | "downvote" | null }

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await params
  const msg = await prisma.spoilerZoneMessage.findUnique({
    where:  { id: messageId },
    select: { id: true, userId: true, isDeleted: true, voteScore: true },
  })
  if (!msg || msg.isDeleted) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (msg.userId === session.user.id) return NextResponse.json({ error: 'Cannot vote own message' }, { status: 400 })

  let body: { type?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const voteType = body.type
  if (voteType !== 'upvote' && voteType !== 'downvote') {
    return NextResponse.json({ error: 'type must be "upvote" or "downvote"' }, { status: 400 })
  }

  const userId = session.user.id
  const existing = await prisma.spoilerZoneVote.findUnique({
    where: { messageId_userId: { messageId, userId } },
  })

  let scoreDelta = 0
  let newVote: 'upvote' | 'downvote' | null = null

  if (!existing) {
    // New vote
    await prisma.spoilerZoneVote.create({ data: { messageId, userId, type: voteType } })
    scoreDelta = voteType === 'upvote' ? 1 : -1
    newVote = voteType
  } else if (existing.type === voteType) {
    // Toggle off
    await prisma.spoilerZoneVote.delete({ where: { id: existing.id } })
    scoreDelta = voteType === 'upvote' ? -1 : 1
    newVote = null
  } else {
    // Switch vote
    await prisma.spoilerZoneVote.update({ where: { id: existing.id }, data: { type: voteType } })
    scoreDelta = voteType === 'upvote' ? 2 : -2
    newVote = voteType
  }

  const updated = await prisma.spoilerZoneMessage.update({
    where: { id: messageId },
    data:  { voteScore: { increment: scoreDelta } },
    select: { voteScore: true },
  })

  return NextResponse.json({ voteScore: updated.voteScore, userVote: newVote })
}
