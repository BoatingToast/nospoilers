import { NextResponse } from 'next/server'
import { MovieNightRoomError } from '@/services/movie-night-live'

export function movieNightApiError(error: unknown, context: string, fallback: string) {
  if (error instanceof MovieNightRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  console.error(context, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
