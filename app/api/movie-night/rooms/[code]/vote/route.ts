import { NextRequest, NextResponse } from 'next/server'
import { castLiveMovieNightVote } from '@/services/movie-night-live'
import type { MovieNightVoteValue } from '@/types'
import { movieNightApiError } from '@/lib/movie-night-api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getMovieNightToken } from '@/lib/movie-night-session'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params
  const token = getMovieNightToken(req, code)
  if (!token) return NextResponse.json({ error: 'Join this room before voting' }, { status: 401 })

  const limited = await enforceRateLimit(req, {
    scope: `movie-night-vote:${code}`,
    identifier: `participant:${token.slice(0, 16)}`,
    limit: 40,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

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
