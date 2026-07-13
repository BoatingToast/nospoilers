import { NextResponse } from 'next/server'
import { getLiveMovieNightRoom } from '@/services/movie-night-live'

type Params = { params: Promise<{ code: string }> }

export async function GET(req: Request, { params }: Params) {
  const { code } = await params
  const token = req.headers.get('x-movie-night-token')

  try {
    const room = await getLiveMovieNightRoom(code, token)
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[GET /api/movie-night/rooms/:code]', error)
    return NextResponse.json({ error: 'Could not load the room' }, { status: 500 })
  }
}
