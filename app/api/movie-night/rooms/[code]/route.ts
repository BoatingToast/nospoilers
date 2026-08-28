import { NextRequest, NextResponse } from 'next/server'
import { getLiveMovieNightRoom } from '@/services/movie-night-live'
import { movieNightApiError } from '@/lib/movie-night-api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params
  const token = getMovieNightToken(req, code)
  const limited = await enforceRateLimit(req, {
    scope: `movie-night-read:${code}`,
    identifier: token ? `participant:${token.slice(0, 16)}` : undefined,
    limit: 90,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  try {
    const room = await getLiveMovieNightRoom(code, token)
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return movieNightApiError(error, '[GET /api/movie-night/rooms/:code]', 'Could not load the room')
  }
}
