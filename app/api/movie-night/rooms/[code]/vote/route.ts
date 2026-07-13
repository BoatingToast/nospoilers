import { NextResponse } from 'next/server'
import { castLiveMovieNightVote } from '@/services/movie-night-live'
import type { MovieNightVoteValue } from '@/types'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: Request, { params }: Params) {
  const { code } = await params
  const token = req.headers.get('x-movie-night-token')
  if (!token) return NextResponse.json({ error: 'Join this room before voting' }, { status: 401 })

  try {
    const body = await req.json() as { candidateId?: string; value?: MovieNightVoteValue }
    if (!body.candidateId || !body.value) {
      return NextResponse.json({ error: 'Movie and vote are required' }, { status: 400 })
    }
    await castLiveMovieNightVote(code, token, body.candidateId, body.value)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the vote'
    const status = message.includes('Join') ? 401 : message.includes('ended') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
