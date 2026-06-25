/**
 * GET /api/profile/[username]/tabs?tab=ratings|watchlist|collections|achievements
 *
 * Returns tab-specific data for a profile, respecting privacy settings.
 * Viewers who are friends see "friends"-visibility content.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { areFriends } from '@/services/friends'

type Tab = 'ratings' | 'watchlist' | 'collections' | 'achievements'

async function canView(
  field: 'ratings' | 'watchlist' | 'collections' | 'activity',
  targetId: string,
  viewerId: string | null,
): Promise<boolean> {
  const privacy = await prisma.userPrivacy.findUnique({ where: { userId: targetId } })
  const setting = privacy?.[field] ?? 'public'

  if (setting === 'public') return true
  if (!viewerId)            return false
  if (viewerId === targetId) return true
  if (setting === 'private') return false
  // 'friends'
  return areFriends(viewerId, targetId)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const session = await getServerSession(authOptions)
  const viewerId = session?.user?.id ?? null

  const { searchParams } = new URL(req.url)
  const tab = (searchParams.get('tab') ?? 'ratings') as Tab

  const target = await prisma.user.findUnique({
    where:  { username, onboardingCompleted: true },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const targetId = target.id

  // ── Ratings tab ─────────────────────────────────────────────────────────────
  if (tab === 'ratings') {
    const allowed = await canView('ratings', targetId, viewerId)
    if (!allowed) return NextResponse.json({ error: 'Private', visible: false }, { status: 403 })

    const { searchParams: sp } = new URL(req.url)
    const sort = (sp.get('sort') ?? 'date') as 'date' | 'score_desc' | 'score_asc'
    const orderBy =
      sort === 'score_desc' ? [{ score: 'desc' as const }, { createdAt: 'desc' as const }] :
      sort === 'score_asc'  ? [{ score: 'asc'  as const }, { createdAt: 'desc' as const }] :
      [{ createdAt: 'desc' as const }]

    const ratings = await prisma.movieRating.findMany({
      where:   { userId: targetId },
      orderBy,
      take:    50,
      select:  { tmdbId: true, title: true, posterPath: true, score: true, createdAt: true, review: true },
    })

    return NextResponse.json({
      visible: true,
      ratings: ratings.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    })
  }

  // ── Watchlist tab ────────────────────────────────────────────────────────────
  if (tab === 'watchlist') {
    const allowed = await canView('watchlist', targetId, viewerId)
    if (!allowed) return NextResponse.json({ error: 'Private', visible: false }, { status: 403 })

    const items = await prisma.watchlistItem.findMany({
      where:   { userId: targetId, status: { in: ['want_to_watch', 'watching'] } },
      orderBy: { addedAt: 'desc' },
      take:    50,
      select:  { tmdbId: true, title: true, posterPath: true, status: true, addedAt: true },
    })

    return NextResponse.json({
      visible: true,
      watchlist: items.map(i => ({ ...i, addedAt: i.addedAt.toISOString() })),
    })
  }

  // ── Collections tab ──────────────────────────────────────────────────────────
  if (tab === 'collections') {
    const allowed = await canView('collections', targetId, viewerId)
    if (!allowed) return NextResponse.json({ error: 'Private', visible: false }, { status: 403 })

    const collections = await prisma.collection.findMany({
      where:   { userId: targetId, isPublic: true },
      orderBy: { updatedAt: 'desc' },
      take:    20,
      include: {
        _count:    { select: { movies: true } },
        analytics: { select: { upvotes: true, score: true } },
        movies:    { take: 4, select: { posterPath: true, tmdbId: true }, orderBy: { addedAt: 'asc' } },
      },
    })

    return NextResponse.json({
      visible: true,
      collections: collections.map(c => ({
        id:          c.id,
        title:       c.title,
        description: c.description,
        coverPath:   c.coverPath,
        movieCount:  c._count.movies,
        upvotes:     c.analytics?.upvotes ?? 0,
        updatedAt:   c.updatedAt.toISOString(),
        previewPosters: c.movies.map(m => m.posterPath).filter(Boolean),
      })),
    })
  }

  // ── Achievements tab ─────────────────────────────────────────────────────────
  if (tab === 'achievements') {
    // Achievements are always public
    const achievements = await prisma.userAchievement.findMany({
      where:   { userId: targetId },
      orderBy: [{ earned: 'desc' }, { earnedAt: 'desc' }],
    })

    return NextResponse.json({
      visible: true,
      achievements: achievements.map(a => ({
        slug:      a.slug,
        progress:  a.progress,
        goal:      a.goal,
        earned:    a.earned,
        earnedAt:  a.earnedAt?.toISOString() ?? null,
      })),
    })
  }

  return NextResponse.json({ error: 'Unknown tab' }, { status: 400 })
}
