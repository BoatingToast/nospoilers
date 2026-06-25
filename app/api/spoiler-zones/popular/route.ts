/**
 * GET /api/spoiler-zones/popular
 *
 * Returns the most active Spoiler Zones across the platform.
 * Ranked by: message activity in the last 7 days, then total members.
 */

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/db'

export async function GET(req: Request) {
  const url   = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '24', 10), 50)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Recent message activity grouped by tmdbId
  const recentActivity = await prisma.spoilerZoneMessage.groupBy({
    by:      ['tmdbId'],
    where:   { isDeleted: false, createdAt: { gte: sevenDaysAgo } },
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
    take:    limit * 2,   // fetch more to merge with member counts
  })

  if (recentActivity.length === 0) return NextResponse.json([])

  const tmdbIds = recentActivity.map(r => r.tmdbId)

  // Batch: member counts + last message time + movie info (from any membership row)
  const [memberCounts, latestMessages, movieInfo] = await Promise.all([
    prisma.spoilerZoneMembership.groupBy({
      by:    ['tmdbId'],
      where: { tmdbId: { in: tmdbIds } },
      _count: { id: true },
    }),
    Promise.all(
      tmdbIds.map(id =>
        prisma.spoilerZoneMessage.findFirst({
          where:   { tmdbId: id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select:  { createdAt: true },
        }).then(m => ({ tmdbId: id, createdAt: m?.createdAt ?? null })),
      ),
    ),
    // Grab movie title + poster from the first membership record for each tmdbId
    Promise.all(
      tmdbIds.map(id =>
        prisma.spoilerZoneMembership.findFirst({
          where:  { tmdbId: id },
          select: { movieTitle: true, moviePoster: true },
        }).then(m => ({ tmdbId: id, movieTitle: m?.movieTitle ?? '', moviePoster: m?.moviePoster ?? null })),
      ),
    ),
  ])

  const memberMap  = new Map(memberCounts.map(r  => [r.tmdbId, r._count.id]))
  const latestMap  = new Map(latestMessages.map(r => [r.tmdbId, r.createdAt]))
  const movieMap   = new Map(movieInfo.map(r => [r.tmdbId, r]))
  const activityMap= new Map(recentActivity.map(r => [r.tmdbId, r._count.id]))

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  const zones = tmdbIds
    .map(id => {
      const movie = movieMap.get(id)
      if (!movie?.movieTitle) return null
      const lastActivityDate = latestMap.get(id)
      return {
        tmdbId:       id,
        movieTitle:   movie.movieTitle,
        moviePoster:  movie.moviePoster,
        memberCount:  memberMap.get(id)   ?? 0,
        weeklyMessages: activityMap.get(id) ?? 0,
        lastActivity: lastActivityDate?.toISOString() ?? null,
        isActive:     lastActivityDate ? lastActivityDate >= thirtyMinutesAgo : false,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Primary: weekly message count; secondary: member count
      if (b!.weeklyMessages !== a!.weeklyMessages) return b!.weeklyMessages - a!.weeklyMessages
      return b!.memberCount - a!.memberCount
    })
    .slice(0, limit)

  return NextResponse.json(zones)
}
