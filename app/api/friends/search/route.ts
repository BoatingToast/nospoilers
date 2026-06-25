import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFriendIds } from '@/services/friends'

// GET /api/friends/search?q=username
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ users: [] })

  const [users, friendIds, pendingOut, pendingIn] = await Promise.all([
    prisma.user.findMany({
      where: {
        username:           { contains: q, mode: 'insensitive' },
        onboardingCompleted: true,
        id:                 { not: session.user.id },
      },
      select: {
        id: true, username: true,
        personality:  { select: { primaryType: true } },
        tasteProfile: { select: { suspenseScore: true } }, // just to confirm profile exists
        _count:       { select: { movieRatings: true, watchlistItems: true } },
      },
      take: 12,
    }),
    getFriendIds(session.user.id),
    prisma.friendRequest.findMany({
      where:  { senderId: session.user.id, status: 'pending' },
      select: { receiverId: true },
    }),
    prisma.friendRequest.findMany({
      where:  { receiverId: session.user.id, status: 'pending' },
      select: { senderId: true, id: true },
    }),
  ])

  const friendSet      = new Set(friendIds)
  const sentSet        = new Set(pendingOut.map(r => r.receiverId))
  const receivedMap    = new Map(pendingIn.map(r => [r.senderId, r.id]))

  return NextResponse.json({
    users: users.map(u => ({
      id:          u.id,
      username:    u.username,
      personality: u.personality?.primaryType ?? null,
      ratingsCount: u._count.movieRatings,
      status: friendSet.has(u.id)
        ? 'friends'
        : sentSet.has(u.id)
        ? 'pending_sent'
        : receivedMap.has(u.id)
        ? 'pending_received'
        : 'none',
      requestId: receivedMap.get(u.id) ?? null,
    })),
  })
}
