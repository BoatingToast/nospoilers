import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFriendRecs } from '@/services/friend-recs'

// GET /api/friends/recommendations
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recs = await getFriendRecs(session.user.id)
  return NextResponse.json({ recs })
}
