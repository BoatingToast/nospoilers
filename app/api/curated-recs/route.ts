import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCuratedRecs } from '@/services/curated-recs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const groups = await getCuratedRecs(session.user.id)
    return NextResponse.json(groups)
  } catch (err) {
    console.error('curated-recs error:', err)
    return NextResponse.json(
      { weThinkYoudLike: [], similarToFavorites: [], expandYourTaste: [], rediscoverClassics: [] },
      { status: 200 }
    )
  }
}
