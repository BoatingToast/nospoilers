/**
 * GET /api/spoiler-zone/[tmdbId]/preview
 *
 * Returns lightweight preview data for the dashboard card hover:
 *   - Last 3 messages (any spoiler level)
 *   - Latest theory message
 *   - Online count (from Presence if available, else recent-activity heuristic)
 */

import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/db'
import type { SZPreview }   from '@/types'

type Params = { params: Promise<{ tmdbId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  // Auth optional — unauthenticated callers still see public preview
  const session = await getServerSession(authOptions)
  void session // not needed for preview

  const [recentMessages, latestTheory, onlineCount] = await Promise.all([
    // Last 3 non-deleted top-level messages
    prisma.spoilerZoneMessage.findMany({
      where:   { tmdbId, isDeleted: false, parentId: null },
      orderBy: { createdAt: 'desc' },
      take:    3,
      select: {
        id:       true,
        content:  true,
        isTheory: true,
        createdAt:true,
        user:     { select: { username: true, avatarUrl: true } },
      },
    }),
    // Most recent theory message
    prisma.spoilerZoneMessage.findFirst({
      where:   { tmdbId, isDeleted: false, isTheory: true, parentId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id:       true,
        content:  true,
        createdAt:true,
        user:     { select: { username: true } },
      },
    }),
    // Online heuristic: distinct users who posted in the last 15 min
    prisma.spoilerZoneMessage.findMany({
      where:    { tmdbId, isDeleted: false, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
      select:   { userId: true },
      distinct: ['userId'],
    }).then(rows => rows.length),
  ])

  const preview: SZPreview = {
    messages: recentMessages.reverse().map(m => ({
      id:        m.id,
      username:  m.user.username,
      avatarUrl: m.user.avatarUrl,
      content:   m.content.slice(0, 140),
      createdAt: m.createdAt.toISOString(),
      isTheory:  m.isTheory,
    })),
    latestTheory: latestTheory
      ? {
          id:        latestTheory.id,
          username:  latestTheory.user.username,
          content:   latestTheory.content.slice(0, 200),
          createdAt: latestTheory.createdAt.toISOString(),
        }
      : null,
    onlineCount,
  }

  return NextResponse.json(preview)
}
