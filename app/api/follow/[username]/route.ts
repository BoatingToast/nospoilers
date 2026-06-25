/**
 * Follow / Unfollow API
 *
 * GET  /api/follow/[username]  — check follow status + social counts
 * POST /api/follow/[username]  — toggle follow/unfollow
 *
 * Auth: uses getToken() (next-auth/jwt) instead of getServerSession() because
 * Next.js 15 made cookies() async, which breaks NextAuth v4's getServerSession
 * in App Router route handlers. getToken reads directly from the JWT cookie and
 * works reliably in all contexts.
 *
 * Mutual-follow logic:
 *   • When A follows B AND B already follows A → Friendship auto-created
 *   • When A unfollows B → Friendship (if any) auto-destroyed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { prisma }                     from '@/lib/db'
import { logActivity }                            from '@/services/activity'
import { notifyNewFollower, notifyNewFriend }      from '@/services/notifications'

type Params = { params: Promise<{ username: string }> }

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// ── GET — check follow status ─────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params
  const token = await getToken({ req })

  const target = await prisma.user.findUnique({
    where:  { username },
    select: {
      id:     true,
      _count: {
        select: {
          followers:      true,
          following:      true,
          friendshipsAsA: true,
          friendshipsAsB: true,
        },
      },
    },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const friendCount = target._count.friendshipsAsA + target._count.friendshipsAsB

  let isFollowing = false
  let isFollower  = false
  let isFriend    = false

  if (token?.id) {
    const myId = token.id as string
    const [followRow, reverseRow, friendship] = await Promise.all([
      prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: myId, followingId: target.id } },
        select: { id: true },
      }),
      prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: target.id, followingId: myId } },
        select: { id: true },
      }),
      (() => {
        const [a, b] = orderedPair(myId, target.id)
        return prisma.friendship.findUnique({
          where: { userAId_userBId: { userAId: a, userBId: b } },
          select: { id: true },
        })
      })(),
    ])
    isFollowing = !!followRow
    isFollower  = !!reverseRow
    isFriend    = !!friendship
  }

  return NextResponse.json({
    isFollowing,
    isFollower,
    isFriend,
    followerCount:  target._count.followers,
    followingCount: target._count.following,
    friendCount,
  })
}

// ── POST — toggle follow/unfollow ─────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params
  const token = await getToken({ req })

  if (!token?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const myId = token.id as string

  const [me, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: myId },     select: { id: true, username: true } }),
    prisma.user.findUnique({ where: { username },      select: { id: true } }),
  ])

  if (!me || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (target.id === myId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const targetId       = target.id
  const [aId, bId]     = orderedPair(myId, targetId)

  const existing = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId: myId, followingId: targetId } },
    select: { id: true },
  })

  // ── Unfollow ─────────────────────────────────────────────────────────────────
  if (existing) {
    await prisma.$transaction([
      prisma.userFollow.delete({ where: { id: existing.id } }),
      prisma.friendship.deleteMany({ where: { userAId: aId, userBId: bId } }),
    ])

    const [fc, fwc] = await Promise.all([
      prisma.userFollow.count({ where: { followingId: targetId } }),
      prisma.userFollow.count({ where: { followerId: myId } }),
    ])

    return NextResponse.json({
      following:      false,
      isFollower:     false,
      isFriend:       false,
      followerCount:  fc,
      followingCount: fwc,
    })
  }

  // ── Follow ────────────────────────────────────────────────────────────────────
  await prisma.userFollow.create({ data: { followerId: myId, followingId: targetId } })

  // Did they already follow us back? → auto-friendship
  const reverseFollow = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId: targetId, followingId: myId } },
    select: { id: true },
  })

  let becameFriends = false
  if (reverseFollow) {
    await prisma.friendship.upsert({
      where:  { userAId_userBId: { userAId: aId, userBId: bId } },
      create: { userAId: aId, userBId: bId },
      update: {},
    })
    becameFriends = true

    // Both get a "you're now friends" notification
    void Promise.all([
      notifyNewFriend(targetId, myId, me.username, username),
      logActivity(myId, 'followed_user', { targetUsername: username, becameFriends: true }),
    ])
  } else {
    // One-way follow
    void Promise.all([
      notifyNewFollower(targetId, myId, me.username),
      logActivity(myId, 'followed_user', { targetUsername: username }),
    ])
  }

  const [fc, fwc] = await Promise.all([
    prisma.userFollow.count({ where: { followingId: targetId } }),
    prisma.userFollow.count({ where: { followerId: myId } }),
  ])

  return NextResponse.json({
    following:      true,
    isFollower:     !!reverseFollow,
    isFriend:       becameFriends,
    followerCount:  fc,
    followingCount: fwc,
  })
}
