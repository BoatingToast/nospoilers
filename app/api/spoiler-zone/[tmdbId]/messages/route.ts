import { NextResponse }                                        from 'next/server'
import { getServerSession }                                   from 'next-auth'
import { authOptions }                                        from '@/lib/auth'
import { prisma }                                             from '@/lib/db'
import { formatMessage, MSG_INCLUDE, VALID_SPOILER_LEVELS }   from '@/lib/spoiler-zone-helpers'

type Params = { params: Promise<{ tmdbId: string }> }

// ── GET /api/spoiler-zone/[tmdbId]/messages ───────────────────────────────────
//
// Query params:
//   cursor  – ID of the oldest message already loaded (load-earlier pagination)
//   filter  – "newest" (default) | "top" | "top_today" | "top_week" | "top_month" | "theories"
//   q       – search query
//   limit   – max messages to return (default 50, max 100)
//
// Response: { messages, pinned, nextCursor, hasMore }

export async function GET(req: Request, { params }: Params) {
  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  const session     = await getServerSession(authOptions)
  const currentUser = session?.user?.id ?? null

  const url         = new URL(req.url)
  const cursor      = url.searchParams.get('cursor')
  const filter      = url.searchParams.get('filter') ?? 'newest'
  const q           = url.searchParams.get('q')?.trim()
  const level       = url.searchParams.get('level') ?? 'safe'  // spoiler level tab
  const limit       = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100)

  // Pinned messages — always returned as a separate array
  const pinnedRows = await prisma.spoilerZoneMessage.findMany({
    where:   { tmdbId, isPinned: true },
    include: MSG_INCLUDE,
    orderBy: { createdAt: 'asc' },
    take:    10,
  })

  // Base where clause: top-level messages only (no replies in main feed)
  const validLevel = VALID_SPOILER_LEVELS.includes(level as never) ? level : 'safe'
  const baseWhere = {
    tmdbId,
    parentId:    null,
    isDeleted:   false,
    spoilerLevel: validLevel,
    ...(filter === 'theories' ? { isTheory: true } : {}),
    ...(q ? { content: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  // Date filter for "top_*" modes
  let dateFilter: object = {}
  if (filter === 'top_today') {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    dateFilter = { createdAt: { gte: since } }
  } else if (filter === 'top_week') {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    dateFilter = { createdAt: { gte: since } }
  } else if (filter === 'top_month') {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    dateFilter = { createdAt: { gte: since } }
  }

  const isTopMode = filter.startsWith('top')
  const orderBy   = isTopMode
    ? [{ voteScore: 'desc' as const }, { createdAt: 'desc' as const }]
    : { createdAt: 'asc' as const }   // ascending so feed reads top-to-bottom

  // For "newest" (live) mode: on first load fetch the last `limit` messages.
  // When cursor is set (load-earlier), fetch messages older than cursor.
  let cursorFilter: object = {}
  if (cursor) {
    const cursorDate = await getCursorDate(cursor)
    if (isTopMode) {
      // top modes: cursor by createdAt desc — fetch older
      cursorFilter = { createdAt: { lt: cursorDate } }
    } else {
      // live (asc) mode: cursor = oldest loaded message — fetch even older
      cursorFilter = { createdAt: { lt: cursorDate } }
    }
  }

  // Fetch limit+1 to detect hasMore
  const rows = await prisma.spoilerZoneMessage.findMany({
    where:   { ...baseWhere, ...dateFilter, ...cursorFilter },
    include: MSG_INCLUDE,
    orderBy,
    take:    limit + 1,
  })

  const hasMore = rows.length > limit
  const page    = hasMore ? rows.slice(0, limit) : rows

  // For live (asc) initial load with no cursor: we only want the LAST `limit` rows.
  // Since they're ordered ASC, if no cursor and more rows exist we need the tail.
  // We handle this by fetching with a DESC order first and reversing:
  let messages = page

  if (!isTopMode && !cursor) {
    // Re-fetch most-recent `limit` messages in DESC, then reverse for ASC display
    const recent = await prisma.spoilerZoneMessage.findMany({
      where:   { ...baseWhere, ...dateFilter },
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'desc' as const },
      take:    limit,
    })
    recent.reverse()
    const totalCount = await prisma.spoilerZoneMessage.count({ where: { ...baseWhere } })
    const olderExist = totalCount > limit

    const pinnedSet = new Set(pinnedRows.map(p => p.id))
    return NextResponse.json({
      messages:    recent.filter(m => !pinnedSet.has(m.id)).map(m => formatMessage(m, currentUser)),
      pinned:      pinnedRows.map(p => formatMessage(p, currentUser)),
      nextCursor:  recent.length > 0 ? recent[0].id : null,   // oldest in current page
      hasMore:     olderExist,
    })
  }

  // For load-earlier (cursor set) or top modes:
  // In load-earlier (ASC), we fetched older rows in DESC order above to get the tail, but here
  // we already have ASC rows from the cursor query — for cursor case, just use them.
  const pinnedSet = new Set(pinnedRows.map(p => p.id))
  const nextCursor = messages.length > 0
    ? (isTopMode ? messages[messages.length - 1].id : messages[0].id)
    : null

  return NextResponse.json({
    messages:   messages.filter(m => !pinnedSet.has(m.id)).map(m => formatMessage(m, currentUser)),
    pinned:     pinnedRows.map(p => formatMessage(p, currentUser)),
    nextCursor,
    hasMore,
  })
}

async function getCursorDate(cursor: string): Promise<Date> {
  const msg = await prisma.spoilerZoneMessage.findUnique({ where: { id: cursor }, select: { createdAt: true } })
  return msg?.createdAt ?? new Date()
}

// ── POST /api/spoiler-zone/[tmdbId]/messages ──────────────────────────────────
// Body: { content, parentId?, isTheory?, movieTitle, spoilerLevel? }
// Requires active membership.

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId: tmdbRaw } = await params
  const tmdbId = parseInt(tmdbRaw, 10)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })

  // Must be a member to post
  const membership = await prisma.spoilerZoneMembership.findUnique({
    where: { userId_tmdbId: { userId: session.user.id, tmdbId } },
  })
  if (!membership) return NextResponse.json({ error: 'Join the Spoiler Zone to post messages' }, { status: 403 })

  let body: { content?: string; parentId?: string; isTheory?: boolean; movieTitle?: string; spoilerLevel?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const content      = body.content?.trim()
  const movieTitle   = body.movieTitle?.trim() ?? ''
  const spoilerLevel = (VALID_SPOILER_LEVELS.includes(body.spoilerLevel as never)
    ? body.spoilerLevel : 'safe') as string

  if (!content || content.length === 0) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (content.length > 2000)            return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

  if (body.parentId) {
    const parent = await prisma.spoilerZoneMessage.findUnique({ where: { id: body.parentId } })
    if (!parent || parent.tmdbId !== tmdbId) return NextResponse.json({ error: 'Parent message not found' }, { status: 400 })
  }

  const created = await prisma.spoilerZoneMessage.create({
    data: {
      tmdbId,
      movieTitle,
      userId:      session.user.id,
      content,
      parentId:    body.parentId ?? null,
      isTheory:    body.isTheory ?? false,
      spoilerLevel,
    },
    include: MSG_INCLUDE,
  })

  return NextResponse.json({ message: formatMessage(created, session.user.id) }, { status: 201 })
}
