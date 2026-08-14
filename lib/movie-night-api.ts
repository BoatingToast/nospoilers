import { NextResponse } from 'next/server'
import { MovieNightRoomError } from '@/services/movie-night-live'
import type { RateLimitResult } from '@/lib/rate-limit'

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

export function movieNightRateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: 'Too many requests. Try again in a moment.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    },
  )
}
