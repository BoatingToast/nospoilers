import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFriendsFeed } from '@/services/friends-feed'

// GET /api/friends/feed
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feed = await getFriendsFeed(session.user.id)
  return NextResponse.json({ feed })
}
