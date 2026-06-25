/**
 * GET /api/followers
 *
 * Returns the authenticated user's followers with full social enrichment.
 *
 * Query params:
 *   limit   — rows per page (default 25, max 100)
 *   cursor  — opaque pagination cursor (last followedAt ISO string)
 *   search  — filter by username or displayName (case-insensitive)
 *   sort    — newest (default) | oldest | alpha | match
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

  const url    = req.nextUrl
  const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? String(PAGE_SIZE), 10))
  const cursor = url.searchParams.get('cursor') ?? null
  const search = url.searchParams.get('search')?.trim().toLowerCase() ?? ''
  const sort   = url.searchParams.get('sort') ?? 'newest'

  // ── 1. Load MY taste data once (needed for match scores) ─────────────────
  const me = await prisma.user.findUnique({
    where:  { id: myId },
    select: {
      tasteProfile: true,
      preferences:  { select: { genres: true, pacing: true, tone: true } },
    },
  })
  const myInput = me ? extractTasteInput(me) : { dna: null, genres: [], pacing: null, tone: null }

  // ── 2. Fetch follower rows with all nested data in ONE query ──────────────
  const rows = await prisma.userFollow.findMany({
    where: {
      followingId: myId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' },
    // Fetch more if we're sorting by alpha or match (need to sort in-memory first)
    take: (sort === 'alpha' || sort === 'match') ? 500 : limit + 1,
    select: {
      createdAt: true,
      follower: {
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

  // ── 3. Check friendship & following status for each follower ─────────────
  const followerIds = rows.map(r => r.follower.id)

  const [myFollowing, myFriendships] = await Promise.all([
    prisma.userFollow.findMany({
      where:  { followerId: myId, followingId: { in: followerIds } },
      select: { followingId: true },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: myId, userBId: { in: followerIds } },
          { userBId: myId, userAId: { in: followerIds } },
        ],
      },
      select: { userAId: true, userBId: true },
    }),
  ])

  const followingSet = new Set(myFollowing.map(r => r.followingId))
  const friendSet    = new Set(
    myFriendships.map(f => f.userAId === myId ? f.userBId : f.userAId)
  )

  // ── 4. Build response rows ────────────────────────────────────────────────
  let result = rows.map(r => {
    const u           = r.follower
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
      isFollowing:    followingSet.has(u.id),
      isFriend:       friendSet.has(u.id),
      tasteMatch,
      followedAt:     r.createdAt.toISOString(),
    }
  })

  // ── 5. Apply search filter ────────────────────────────────────────────────
  if (search) {
    result = result.filter(u =>
      u.username.toLowerCase().includes(search) ||
      (u.displayName?.toLowerCase().includes(search) ?? false)
    )
  }

  // ── 6. In-memory sort for alpha / match ───────────────────────────────────
  if (sort === 'alpha') {
    result.sort((a, b) =>
      (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username)
    )
  } else if (sort === 'match') {
    result.sort((a, b) => (b.tasteMatch ?? 0) - (a.tasteMatch ?? 0))
  }

  // ── 7. Paginate ───────────────────────────────────────────────────────────
  const hasMore  = (sort === 'alpha' || sort === 'match')
    ? false  // in-memory: return all (client handles pagination)
    : result.length > limit

  const page = (sort === 'alpha' || sort === 'match')
    ? result
    : result.slice(0, limit)

  const nextCursor = hasMore ? page[page.length - 1]?.followedAt ?? null : null

  // Total count (unfiltered)
  const total = await prisma.userFollow.count({ where: { followingId: myId } })

  return NextResponse.json({ followers: page, total, hasMore, nextCursor })
}
