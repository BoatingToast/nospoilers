import { NextRequest, NextResponse } from 'next/server'
import { getToken }                  from 'next-auth/jwt'
import { prisma }                    from '@/lib/db'

// GET /api/activity/mine?limit=8
export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(
    parseInt(new URL(req.url).searchParams.get('limit') ?? '8', 10),
    50,
  )

  const events = await prisma.activityEvent.findMany({
    where:   { userId: token.id as string },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select:  { id: true, type: true, data: true, createdAt: true },
  })

  return NextResponse.json({
    events: events.map(e => ({
      ...e,
      data:      (e.data as Record<string, unknown>) ?? {},
      createdAt: e.createdAt.toISOString(),
    })),
  })
}
