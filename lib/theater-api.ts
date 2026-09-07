import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { TheaterError } from '@/lib/theater'

export async function theaterUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new TheaterError('Sign in to enter NoSpoilers Theater.', 401)
  if (!hasProAccess(session.user.email)) throw new TheaterError('Theater is included in the private NoSpoilers Pro preview.', 403)
  return session.user
}

export function theaterJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export function theaterApiError(error: unknown) {
  if (error instanceof TheaterError) return theaterJson({ error: error.message }, error.status)
  if (error instanceof SyntaxError) return theaterJson({ error: 'Invalid request body.' }, 400)
  console.error('[theater]', error)
  return theaterJson({ error: 'Theater is temporarily unavailable. Please try again.' }, 503)
}
