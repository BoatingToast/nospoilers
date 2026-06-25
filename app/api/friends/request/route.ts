import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from '@/services/friends'

// POST /api/friends/request — send a friend request
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const result = await sendFriendRequest(session.user.id, target.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}

// PATCH /api/friends/request — accept or reject a request
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, action } = await req.json()
  if (!requestId || !action) return NextResponse.json({ error: 'requestId and action required' }, { status: 400 })

  let result: { ok: boolean; error?: string }
  if (action === 'accept') {
    result = await acceptFriendRequest(requestId, session.user.id)
  } else if (action === 'reject') {
    result = await rejectFriendRequest(requestId, session.user.id)
  } else {
    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 })
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
