import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLiveMovieNightRoom, type CreateLiveRoomInput } from '@/services/movie-night-live'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const input = await req.json() as CreateLiveRoomInput
    const room = await createLiveMovieNightRoom(session.user.id, input)
    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the room'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
