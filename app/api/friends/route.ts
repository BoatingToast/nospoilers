/**
 * GET /api/friends — mutual-follow friends with full social enrichment
 *
 * Query params:
 *   limit   — rows per page (default 25, max 100)
 *   cursor  — pagination cursor
 *   search  — filter by username / displayName
 *   sort    — newest | oldest | alpha | match (default: match)
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
  const search = url.searchParams.get('search')?.trim().toLowerCase() ?? ''
  const sort   = url.searchParams.get('sort') ?? 'match'

  // ── 1. My taste data ──────────────────────────────────────────────────────
  const me = await prisma.user.findUnique({
    where:  { id: myId },
    select: {
      tasteProfile: true,
      preferences:  { select: { genres: true, pacing: true, tone: true } },
    },
  })
  const myInput = me ? extractTasteInput(me) : { dna: null, genres: [], pacing: null, tone: null }

  // ── 2. Fetch friendships (both sides) with full nested data ───────────────
  const friendships = await prisma.friendship.findMany({
    where:   { OR: [{ userAId: myId }, { userBId: myId }] },
    orderBy: { createdAt: 'desc' },
    select:  {
      createdAt: true,
      userAId:   true,
      userA: {
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
      userB: {
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

  // ── 3. Build result rows ──────────────────────────────────────────────────
  let result = friendships.map(f => {
    const u           = f.userAId === myId ? f.userB : f.userA
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
      isFollowing:    true,  // friends always follow each other
      isFriend:       true,
      tasteMatch,
      friendSince:    f.createdAt.toISOString(),
    }
  })

  // ── 4. Search ─────────────────────────────────────────────────────────────
  if (search) {
    result = result.filter(u =>
      u.username.toLowerCase().includes(search) ||
      (u.displayName?.toLowerCase().includes(search) ?? false)
    )
  }

  // ── 5. Sort ───────────────────────────────────────────────────────────────
  switch (sort) {
    case 'oldest': result.sort((a, b) => a.friendSince.localeCompare(b.friendSince)); break
    case 'alpha':  result.sort((a, b) =>
      (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username)); break
    case 'match':  result.sort((a, b) => (b.tasteMatch ?? 0) - (a.tasteMatch ?? 0)); break
    // newest: already sorted by DB
  }

  const total = result.length

  return NextResponse.json({ friends: result, total })
}
