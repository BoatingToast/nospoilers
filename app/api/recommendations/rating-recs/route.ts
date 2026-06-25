import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRatingBasedRecs } from '@/services/rating-recs'

// GET /api/recommendations/rating-recs
// Returns up to 12 "Based On Your Ratings" recommendations.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const recs = await getRatingBasedRecs(session.user.id)
    return NextResponse.json({ recs }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (err) {
    console.error('[rating-recs] error:', err)
    return NextResponse.json({ recs: [] })
  }
}
