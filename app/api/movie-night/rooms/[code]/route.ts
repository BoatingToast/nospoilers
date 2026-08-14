import { NextRequest, NextResponse } from 'next/server'
import { getLiveMovieNightRoom } from '@/services/movie-night-live'
import { movieNightApiError, movieNightRateLimitResponse } from '@/lib/movie-night-api'
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit'
import { getMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params
  const token = getMovieNightToken(req, code)
  const rateLimit = checkRateLimit(
    `movie-night:read:${code}:${token ? `participant:${token.slice(0, 16)}` : requestClientKey(req)}`,
    90,
    60 * 1000,
  )
  if (!rateLimit.allowed) return movieNightRateLimitResponse(rateLimit)

  try {
    const room = await getLiveMovieNightRoom(code, token)
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return movieNightApiError(error, '[GET /api/movie-night/rooms/:code]', 'Could not load the room')
  }
}
