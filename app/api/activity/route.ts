/**
 * GET /api/activity — current user's own activity feed (newest first)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { getActivityFeed }            from '@/services/activity'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(
    50,
    parseInt(new URL(req.url).searchParams.get('limit') ?? '20', 10),
  )

  const events = await getActivityFeed(token.id as string, limit)
  return NextResponse.json({ events })
}
