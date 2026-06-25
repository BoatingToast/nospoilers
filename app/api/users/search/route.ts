/**
 * GET /api/users/search
 *
 * Query params:
 *   q       — search query (username or displayName)
 *   filter  — 'all' | 'following' | 'friends' | 'followers'
 *   sort    — 'most_followers' | 'newest' | 'compatible' | 'alphabetical'
 *   limit   — max results (default 24, max 50)
 *
 * Uses getToken() (not getServerSession) for reliable Next.js 15 App Router auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { prisma }                     from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  const myId  = (token?.id as string | undefined) ?? null

  const url    = req.nextUrl
  const q      = url.searchParams.get('q')?.trim() ?? ''
  const filter = url.searchParams.get('filter') ?? 'all'
  const sort   = url.searchParams.get('sort')   ?? 'most_followers'
  const limit  = Math.min(50, parseInt(url.searchParams.get('limit') ?? '24', 10))

  // Determine which user IDs to include based on filter
  let filterIds: string[] | null = null

  if (myId && filter !== 'all') {
    if (filter === 'following') {
      const rows = await prisma.userFollow.findMany({
        where:  { followerId: myId },
        select: { followingId: true },
      })
      filterIds = rows.map(r => r.followingId)
    } else if (filter === 'followers') {
      const rows = await prisma.userFollow.findMany({
        where:  { followingId: myId },
        select: { followerId: true },
      })
      filterIds = rows.map(r => r.followerId)
    } else if (filter === 'friends') {
      const rows = await prisma.friendship.findMany({
        where:  { OR: [{ userAId: myId }, { userBId: myId }] },
        select: { userAId: true, userBId: true },
      })
      filterIds = rows.map(r => r.userAId === myId ? r.userBId : r.userAId)
    }
    if (filterIds?.length === 0) return NextResponse.json([])
  }

  // Exclude self
  const excludeId = myId ?? '__nobody__'

  const baseWhere = {
    onboardingCompleted: true,
    id:                  { not: excludeId },
    ...(q ? {
      OR: [
        { username:    { contains: q, mode: 'insensitive' as const } },
        { displayName: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(filterIds ? { id: { in: filterIds, not: excludeId } } : {}),
  }

  let orderBy: object = { followers: { _count: 'desc' as const } }
  if (sort === 'newest')       orderBy = { createdAt: 'desc' as const }
  if (sort === 'alphabetical') orderBy = { username: 'asc' as const }

  const users = await prisma.user.findMany({
    where:   baseWhere,
    orderBy,
    take:    limit,
    select: {
      id:          true,
      username:    true,
      displayName: true,
      avatarUrl:   true,
      createdAt:   true,
      personality: { select: { primaryType: true } },
      preferences: { select: { genres: true } },
      _count:      { select: { followers: true, following: true } },
    },
  })

  // Enrich with follow/friend status relative to session user
  let followingSet = new Set<string>()
  let friendSet    = new Set<string>()

  if (myId && users.length > 0) {
    const userIds = users.map(u => u.id)
    const [followRows, friendRows] = await Promise.all([
      prisma.userFollow.findMany({
        where:  { followerId: myId, followingId: { in: userIds } },
        select: { followingId: true },
      }),
      prisma.friendship.findMany({
        where: {
          OR: [
            { userAId: myId, userBId: { in: userIds } },
            { userBId: myId, userAId: { in: userIds } },
          ],
        },
        select: { userAId: true, userBId: true },
      }),
    ])
    followingSet = new Set(followRows.map(r => r.followingId))
    friendSet    = new Set(friendRows.map(r => r.userAId === myId ? r.userBId : r.userAId))
  }

  return NextResponse.json(users.map(u => ({
    id:             u.id,
    username:       u.username,
    displayName:    u.displayName   ?? null,
    avatarUrl:      u.avatarUrl     ?? null,
    personality:    u.personality?.primaryType ?? null,
    topGenre:       u.preferences?.genres?.[0] ?? null,
    followerCount:  u._count.followers,
    followingCount: u._count.following,
    isFollowing:    followingSet.has(u.id),
    isFriend:       friendSet.has(u.id),
    joinedAt:       u.createdAt.toISOString(),
  })))
}
