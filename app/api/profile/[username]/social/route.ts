/**
 * GET /api/profile/[username]/social?tab=followers|following|friends
 *
 * Returns the list of users for the given social tab,
 * enriched with isFollowing + isFriend relative to the session user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { prisma }                     from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const token = await getToken({ req })
  const myId  = (token?.id as string | undefined) ?? null
  const { username } = await params

  const tab = new URL(req.url).searchParams.get('tab') ?? 'followers'

  // Resolve the profile user
  const profileUser = await prisma.user.findUnique({
    where:  { username },
    select: { id: true },
  })
  if (!profileUser) return NextResponse.json({ users: [] })

  const profileId = profileUser.id

  // Fetch the list of user IDs based on the tab
  let userIds: string[] = []

  if (tab === 'followers') {
    const rows = await prisma.userFollow.findMany({
      where:  { followingId: profileId },
      select: { followerId: true },
      orderBy: { createdAt: 'desc' },
      take:   200,
    })
    userIds = rows.map(r => r.followerId)
  } else if (tab === 'following') {
    const rows = await prisma.userFollow.findMany({
      where:  { followerId: profileId },
      select: { followingId: true },
      orderBy: { createdAt: 'desc' },
      take:   200,
    })
    userIds = rows.map(r => r.followingId)
  } else if (tab === 'friends') {
    const rows = await prisma.friendship.findMany({
      where:  { OR: [{ userAId: profileId }, { userBId: profileId }] },
      select: { userAId: true, userBId: true },
      orderBy: { createdAt: 'desc' },
      take:   200,
    })
    userIds = rows.map(r => r.userAId === profileId ? r.userBId : r.userAId)
  }

  if (userIds.length === 0) return NextResponse.json({ users: [] })

  // Fetch user data
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: {
      id:          true,
      username:    true,
      avatarUrl:   true,
      personality: { select: { primaryType: true } },
      preferences: { select: { genres: true } },
    },
  })

  // Batch follow/friend enrichment relative to session user
  let followingSet = new Set<string>()
  let friendSet    = new Set<string>()
  if (myId) {
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

  // Preserve original order from the follow/friendship query
  const userMap = new Map(users.map(u => [u.id, u]))
  const ordered = userIds
    .map(id => userMap.get(id))
    .filter(Boolean) as typeof users

  return NextResponse.json({
    users: ordered.map(u => ({
      id:          u.id,
      username:    u.username,
      avatarUrl:   u.avatarUrl,
      personality: u.personality?.primaryType ?? null,
      topGenre:    u.preferences?.genres?.[0]  ?? null,
      isFollowing: followingSet.has(u.id),
      isFriend:    friendSet.has(u.id),
    })),
  })
}
