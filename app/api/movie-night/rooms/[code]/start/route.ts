import { NextRequest, NextResponse } from 'next/server'
import { startLiveMovieNightRoom } from '@/services/movie-night-live'
import { movieNightApiError, movieNightRateLimitResponse } from '@/lib/movie-night-api'
import { checkRateLimit } from '@/lib/rate-limit'
import { getMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params
  const token = getMovieNightToken(req, code)
  if (!token) return NextResponse.json({ error: 'Join this room before starting' }, { status: 401 })

  const rateLimit = checkRateLimit(`movie-night:start:${code}:${token.slice(0, 16)}`, 10, 60 * 1000)
  if (!rateLimit.allowed) return movieNightRateLimitResponse(rateLimit)

  try {
    await startLiveMovieNightRoom(code, token)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return movieNightApiError(error, '[POST /api/movie-night/rooms/:code/start]', 'Could not start voting')
  }
}
