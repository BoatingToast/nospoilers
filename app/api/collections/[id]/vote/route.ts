import { NextRequest, NextResponse }            from 'next/server'
import { getServerSession }                     from 'next-auth'
import { authOptions }                          from '@/lib/auth'
import { castVote, removeVote }                  from '@/services/collection-votes'
import { notifyCollectionUpvote }                from '@/services/notifications'
import { prisma }                                from '@/lib/db'
import type { VoteType }                         from '@/types'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const myId    = session?.user?.id as string | undefined
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: collectionId } = await params

  let body: { voteType?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const voteType = body.voteType
  if (voteType !== 'upvote' && voteType !== 'downvote')
    return NextResponse.json({ error: 'voteType must be "upvote" or "downvote"' }, { status: 400 })

  try {
    const result = await castVote(myId, collectionId, voteType as VoteType)

    if (voteType === 'upvote') {
      void prisma.collection.findUnique({
        where:  { id: collectionId },
        select: { userId: true, title: true },
      }).then(col => {
        if (col && col.userId !== myId) {
          notifyCollectionUpvote(col.userId, myId, collectionId, col.title).catch(() => {})
        }
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to cast vote'
    const status = msg.includes('own collection') ? 403 : msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const uid     = session?.user?.id as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: collectionId } = await params

  try {
    const result = await removeVote(uid, collectionId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
