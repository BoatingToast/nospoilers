import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { joinLiveMovieNightRoom } from '@/services/movie-night-live'

type Params = { params: Promise<{ code: string }> }

export async function POST(req: Request, { params }: Params) {
  const { code } = await params
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
    )
    return NextResponse.json(participant, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not join the room'
    const status = message.includes('not found') ? 404 : message.includes('ended') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
