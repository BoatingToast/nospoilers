import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCuratedRecs } from '@/services/curated-recs'
import { parseRecommendationMood } from '@/lib/recommendation-preferences'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const mood = parseRecommendationMood(new URL(req.url).searchParams)
    const groups = await getCuratedRecs(session.user.id, mood)
    return NextResponse.json(groups)
  } catch (err) {
    console.error('curated-recs error:', err)
    return NextResponse.json(
      { error: 'Recommendations are temporarily unavailable.' },
      { status: 503 },
    )
  }
}
