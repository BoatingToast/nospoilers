import { NextRequest, NextResponse }    from 'next/server'
import { getToken }                      from '@/lib/get-auth-token'
import { generateRecommendations }       from '@/services/recommendations'
import { notifyRecsRefreshed }           from '@/services/notifications'
import { enforceRateLimit }               from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = token.id as string
  const limited = await enforceRateLimit(req, {
    scope: 'recommendation-refresh',
    identifier: `user:${myId}`,
    limit: 3,
    windowMs: 10 * 60 * 1000,
  })
  if (limited) return limited

  try {
    const count = await generateRecommendations(myId)
    await notifyRecsRefreshed(myId, typeof count === 'number' ? count : 0)
    return NextResponse.json({ ok: true, count: count ?? 0 })
  } catch (error) {
    console.error('[recommendations/refresh]', error)
    return NextResponse.json({ error: 'Failed to refresh recommendations.' }, { status: 500 })
  }
}
