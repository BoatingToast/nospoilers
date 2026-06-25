import { NextResponse }     from 'next/server'
import { prisma }           from '@/lib/db'

type Params = { params: Promise<{ tmdbId: string }> }

// ── GET /api/spoiler-zone/[tmdbId]/stats ─────────────────────────────────────
// Returns member count and total message count for a movie's Spoiler Zone.
// Online count is handled client-side via Supabase Presence.

export async function GET(_req: Request, { params }: Params) {
  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  const [messageCount, memberResult] = await Promise.all([
    prisma.spoilerZoneMessage.count({ where: { tmdbId } }),
    prisma.spoilerZoneMessage.groupBy({
      by:    ['userId'],
      where: { tmdbId },
      _count: { userId: true },
    }),
  ])

  return NextResponse.json({
    memberCount:  memberResult.length,
    messageCount,
    onlineCount:  0, // populated by Supabase Presence on client
  })
}
