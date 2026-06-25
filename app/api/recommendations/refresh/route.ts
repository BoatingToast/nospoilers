import { NextRequest, NextResponse }    from 'next/server'
import { getToken }                      from 'next-auth/jwt'
import { generateRecommendations }       from '@/services/recommendations'
import { notifyRecsRefreshed }           from '@/services/notifications'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = token.id as string

  try {
    const count = await generateRecommendations(myId)
    // Notify user their recs have been refreshed (non-blocking)
    void notifyRecsRefreshed(myId, typeof count === 'number' ? count : 0).catch(() => {})
    return NextResponse.json({ ok: true, count: count ?? 0 })
  } catch (error) {
    console.error('[recommendations/refresh]', error)
    return NextResponse.json({ error: 'Failed to refresh recommendations.' }, { status: 500 })
  }
}
