/** GET /api/activity/feed — social feed for the current user */

import { NextRequest, NextResponse } from 'next/server'
import { getToken }                   from 'next-auth/jwt'
import { getFriendsFeed }             from '@/services/friends-feed'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ feed: [] })

  const url   = req.nextUrl
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '40', 10))

  const feed = await getFriendsFeed(token.id as string, limit)
  return NextResponse.json({ feed })
}
