import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { joinLiveMovieNightRoom } from '@/services/movie-night-live'
import { movieNightApiError, movieNightRateLimitResponse } from '@/lib/movie-night-api'
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit'
import { getMovieNightToken, rememberMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params
  const rateLimit = checkRateLimit(
    `movie-night:join:${code}:${requestClientKey(req)}`,
    20,
    10 * 60 * 1000,
  )
  if (!rateLimit.allowed) return movieNightRateLimitResponse(rateLimit)

  const session = await getServerSession(authOptions)

  try {
    const body = await req.json() as { displayName?: string }
    const participant = await joinLiveMovieNightRoom(
      code,
      body.displayName,
      session?.user?.id
        ? {
            id: session.user.id,
            username: session.user.name ?? body.displayName ?? 'Guest',
            avatarUrl: session.user.image ?? null,
          }
        : null,
      getMovieNightToken(req, code),
    )
    const response = NextResponse.json(participant, { status: 201 })
    rememberMovieNightToken(response, code, participant.token)
    return response
  } catch (error) {
    return movieNightApiError(error, '[POST /api/movie-night/rooms/:code/join]', 'Could not join the room')
  }
}
