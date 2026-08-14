import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLiveMovieNightRoom, type CreateLiveRoomInput } from '@/services/movie-night-live'
import { movieNightApiError, movieNightRateLimitResponse } from '@/lib/movie-night-api'
import { checkRateLimit } from '@/lib/rate-limit'
import { rememberMovieNightToken } from '@/lib/movie-night-session'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`movie-night:create:${session.user.id}`, 10, 10 * 60 * 1000)
  if (!rateLimit.allowed) return movieNightRateLimitResponse(rateLimit)

  try {
    const input = await req.json() as CreateLiveRoomInput
    const room = await createLiveMovieNightRoom(session.user.id, input)
    const response = NextResponse.json(room, { status: 201 })
    rememberMovieNightToken(response, room.code, room.token)
    return response
  } catch (error) {
    return movieNightApiError(error, '[POST /api/movie-night/rooms]', 'Could not create the room')
  }
}
