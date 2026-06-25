/**
 * GET /api/user/spoiler-zones
 *
 * Returns the current user's Spoiler Zone memberships enriched with:
 *   - memberCount, messageCount, unreadCount, lastActivity
 *   - pinned, notificationsEnabled, isActive
 *
 * Used by the dashboard hub section, profile page, and profile memberships component.
 */

import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'
import type { SZMembership } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const memberships = await prisma.spoilerZoneMembership.findMany({
    where:   { userId },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })

  if (memberships.length === 0) return NextResponse.json([])

  const tmdbIds          = memberships.map(m => m.tmdbId)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  const [memberCounts, messageCounts, unreadCounts, latestMessages, activeMovies] =
    await Promise.all([
      // Members per movie
      prisma.spoilerZoneMembership.groupBy({
        by:    ['tmdbId'],
        where: { tmdbId: { in: tmdbIds } },
        _count: { id: true },
      }),
      // Total messages per movie (non-deleted)
      prisma.spoilerZoneMessage.groupBy({
        by:    ['tmdbId'],
        where: { tmdbId: { in: tmdbIds }, isDeleted: false },
        _count: { id: true },
      }),
      // Unread: messages newer than lastSeenAt per membership
      Promise.all(
        memberships.map(m =>
          prisma.spoilerZoneMessage.count({
            where: {
              tmdbId:    m.tmdbId,
              isDeleted: false,
              createdAt: { gt: m.lastSeenAt },
            },
          }).then(count => ({ tmdbId: m.tmdbId, count })),
        ),
      ),
      // Latest message timestamp per movie
      Promise.all(
        tmdbIds.map(id =>
          prisma.spoilerZoneMessage.findFirst({
            where:   { tmdbId: id, isDeleted: false },
            orderBy: { createdAt: 'desc' },
            select:  { createdAt: true },
          }).then(msg => ({ tmdbId: id, createdAt: msg?.createdAt ?? null })),
        ),
      ),
      // Active movies: any message in the last 30 min
      prisma.spoilerZoneMessage.findMany({
        where:    { tmdbId: { in: tmdbIds }, isDeleted: false, createdAt: { gte: thirtyMinutesAgo } },
        select:   { tmdbId: true },
        distinct: ['tmdbId'],
      }),
    ])

  const memberMap = new Map(memberCounts.map(r  => [r.tmdbId, r._count.id]))
  const msgMap    = new Map(messageCounts.map(r  => [r.tmdbId, r._count.id]))
  const unreadMap = new Map(unreadCounts.map(r   => [r.tmdbId, r.count]))
  const latestMap = new Map(latestMessages.map(r => [r.tmdbId, r.createdAt]))
  const activeSet = new Set(activeMovies.map(r => r.tmdbId))

  const result: SZMembership[] = memberships.map(m => ({
    id:                   m.id,
    tmdbId:               m.tmdbId,
    movieTitle:           m.movieTitle,
    moviePoster:          m.moviePoster,
    memberCount:          memberMap.get(m.tmdbId)  ?? 0,
    messageCount:         msgMap.get(m.tmdbId)    ?? 0,
    unreadCount:          unreadMap.get(m.tmdbId) ?? 0,
    lastActivity:         latestMap.get(m.tmdbId)?.toISOString() ?? null,
    joinedAt:             m.createdAt.toISOString(),
    pinned:               m.pinned,
    pinnedAt:             m.pinnedAt?.toISOString() ?? null,
    notificationsEnabled: m.notificationsEnabled,
    isActive:             activeSet.has(m.tmdbId),
  }))

  return NextResponse.json(result)
}
