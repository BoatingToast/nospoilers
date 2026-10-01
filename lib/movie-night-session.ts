import type { NextRequest, NextResponse } from 'next/server'

const COOKIE_PREFIX = 'nospoilers_mn_'
const ROOM_LIFETIME_SECONDS = 7 * 24 * 60 * 60

export function movieNightCookieName(code: string): string {
  return `${COOKIE_PREFIX}${code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`
}

export function getMovieNightToken(request: NextRequest, code: string): string | null {
  return request.headers.get('x-movie-night-token')
    ?? request.cookies.get(movieNightCookieName(code))?.value
    ?? null
}

export function rememberMovieNightToken(
  response: NextResponse,
  code: string,
  token: string,
): void {
  response.cookies.set(movieNightCookieName(code), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ROOM_LIFETIME_SECONDS,
  })
}
