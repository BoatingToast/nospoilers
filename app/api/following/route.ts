/**
 * GET /api/following
 *
 * Returns the list of users the authenticated user follows.
 *
 * Query params:
 *   limit       — rows per page (default 25, max 100)
 *   cursor      — opaque pagination cursor (last followedAt ISO string)
 *   search      — filter by username or displayName
 *   sort        — newest (default) | oldest | alpha | match
 *   onlyFriends — "true" to show only mutual follows
 */

import { NextRequest, NextResponse }            from 'next/server'
import { getToken }                             from 'next-auth/jwt'
import { prisma }                               from '@/lib/db'
import { computeTasteMatch, extractTasteInput } from '@/services/taste-match'
import { getPersonalityBySlug }                 from '@/services/personality'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = token.id as string

  const url         = req.nextUrl
  const limit       = Math.min(100, parseInt(url.searchParams.get('limit') ?? String(PAGE_SIZE), 10))
  const cursor      = url.searchParams.get('cursor') ?? null
  const search      = url.searchParams.get('search')?.trim().toLowerCase() ?? ''
  const sort        = url.searchParams.get('sort') ?? 'newest'
  const onlyFriends = url.searchParams.get('onlyFriends') === 'true'

  // ── 1. My taste data ──────────────────────────────────────────────────────
  const me = await prisma.user.findUnique({
    where:  { id: myId },
    select: {
      tasteProfile: true,
      preferences:  { select: { genres: true, pacing: true, tone: true } },
    },
  })
  const myInput = me ? extractTasteInput(me) : { dna: null, genres: [], pacing: null, tone: null }

  // ── 2. Fetch following rows ───────────────────────────────────────────────
  const rows = await prisma.userFollow.findMany({
    where: {
      followerId: myId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    take: (sort === 'alpha' || sort === 'match' || onlyFriends) ? 500 : limit + 1,
    select: {
      createdAt: true,
      following: {
        select: {
          id:          true,
          username:    true,
          displayName: true,
          avatarUrl:   true,
          tasteProfile: true,
          preferences:  { select: { genres: true, pacing: true, tone: true } },
          personality:  { select: { primaryType: true } },
          _count: {
            select: { followers: true, following: true },
          },
        },
      },
    },
  })

  // ── 3. Friendship check ───────────────────────────────────────────────────
  const followingIds = rows.map(r => r.following.id)

  const myFriendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userAId: myId, userBId: { in: followingIds } },
        { userBId: myId, userAId: { in: followingIds } },
      ],
    },
    select: { userAId: true, userBId: true },
  })
  const friendSet = new Set(
    myFriendships.map(f => f.userAId === myId ? f.userBId : f.userAId)
  )

  // ── 4. Build result rows ──────────────────────────────────────────────────
  let result = rows.map(r => {
    const u           = r.following
    const otherInput  = extractTasteInput(u)
    const tasteMatch  = computeTasteMatch(myInput, otherInput)
    const personalityName = u.personality?.primaryType
      ? (getPersonalityBySlug(u.personality.primaryType)?.name ?? u.personality.primaryType)
      : null

    return {
      id:             u.id,
      username:       u.username,
      displayName:    u.displayName,
      avatarUrl:      u.avatarUrl,
      personality:    personalityName,
      genres:         u.preferences?.genres?.slice(0, 3) ?? [],
      followerCount:  u._count.followers,
      followingCount: u._count.following,
      isFollowing:    true,            // by definition — they are in the following list
      isFriend:       friendSet.has(u.id),
      tasteMatch,
      followedAt:     r.createdAt.toISOString(),
    }
  })

  // ── 5. onlyFriends filter ─────────────────────────────────────────────────
  if (onlyFriends) {
    result = result.filter(u => u.isFriend)
  }

  // ── 6. Search ─────────────────────────────────────────────────────────────
  if (search) {
    result = result.filter(u =>
      u.username.toLowerCase().includes(search) ||
      (u.displayName?.toLowerCase().includes(search) ?? false)
    )
  }

  // ── 7. Sort ───────────────────────────────────────────────────────────────
  if (sort === 'alpha') {
    result.sort((a, b) =>
      (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username)
    )
  } else if (sort === 'match') {
    result.sort((a, b) => (b.tasteMatch ?? 0) - (a.tasteMatch ?? 0))
  }

  // ── 8. Paginate ───────────────────────────────────────────────────────────
  const inMemory = sort === 'alpha' || sort === 'match' || onlyFriends || !!search
  const hasMore  = inMemory ? false : result.length > limit
  const page     = inMemory ? result : result.slice(0, limit)
  const nextCursor = hasMore ? page[page.length - 1]?.followedAt ?? null : null

  const total = await prisma.userFollow.count({ where: { followerId: myId } })

  return NextResponse.json({ following: page, total, hasMore, nextCursor })
}
