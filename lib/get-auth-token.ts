/**
 * Read a NextAuth JWT using the session-cookie name that is actually present
 * on the request.
 *
 * NextAuth can choose either the secure or unprefixed name depending on the
 * origin it resolves while creating the session. Inferring that choice later
 * from NODE_ENV is unreliable for production deployments behind a proxy and
 * can turn a valid signed-in session into a false 401.
 */
import { getToken as getNextAuthToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
] as const

function hasSessionCookie(req: NextRequest, cookieName: string): boolean {
  return req.cookies.getAll().some(cookie =>
    cookie.name === cookieName || cookie.name.startsWith(`${cookieName}.`),
  )
}

export async function getToken(options: { req: NextRequest }): Promise<JWT | null> {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    if (!hasSessionCookie(options.req, cookieName)) continue

    const token = await getNextAuthToken({ ...options, cookieName })
    if (token) return token
  }

  // Preserve NextAuth's default behavior for bearer tokens and requests that
  // do not contain one of the standard session-cookie names.
  return getNextAuthToken(options)
}
