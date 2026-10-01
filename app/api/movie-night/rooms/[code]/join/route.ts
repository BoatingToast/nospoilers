import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { joinLiveMovieNightRoom } from '@/services/movie-night-live'
import { movieNightApiError } from '@/lib/movie-night-api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getMovieNightToken, rememberMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params
  const limited = await enforceRateLimit(req, {
    scope: `movie-night-join:${code}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (limited) return limited

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
