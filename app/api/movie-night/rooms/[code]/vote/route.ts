import { NextRequest, NextResponse } from 'next/server'
import { castLiveMovieNightVote } from '@/services/movie-night-live'
import type { MovieNightVoteValue } from '@/types'
import { movieNightApiError, movieNightRateLimitResponse } from '@/lib/movie-night-api'
import { checkRateLimit } from '@/lib/rate-limit'
import { getMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params
  const token = getMovieNightToken(req, code)
  if (!token) return NextResponse.json({ error: 'Join this room before voting' }, { status: 401 })

  const rateLimit = checkRateLimit(`movie-night:vote:${code}:${token.slice(0, 16)}`, 40, 60 * 1000)
  if (!rateLimit.allowed) return movieNightRateLimitResponse(rateLimit)

  try {
    const body = await req.json() as { candidateId?: string; value?: MovieNightVoteValue }
    if (!body.candidateId || !body.value) {
      return NextResponse.json({ error: 'Movie and vote are required' }, { status: 400 })
    }
    await castLiveMovieNightVote(code, token, body.candidateId, body.value)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return movieNightApiError(error, '[POST /api/movie-night/rooms/:code/vote]', 'Could not save the vote')
  }
}
