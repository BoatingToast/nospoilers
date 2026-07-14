/**
 * Drop-in replacement for next-auth/jwt's getToken().
 *
 * next-auth's own secureCookie detection is:
 *   (NEXTAUTH_URL?.startsWith("https://")) ?? !!process.env.VERCEL
 * Since NEXTAUTH_URL is set to http://localhost:3000 for local dev, that
 * expression evaluates to the boolean `false` — not undefined — so `??`
 * never falls through to the VERCEL check. On the deployed (HTTPS) site,
 * NextAuth still sets the `__Secure-`-prefixed cookie (its cookie logic
 * derives origin from the request, not NEXTAUTH_URL), but getToken() looks
 * for the unprefixed cookie name and always comes back null — silently
 * treating logged-in users as signed out.
 *
 * Deciding secureCookie from the deployment environment instead keeps both
 * sides in agreement regardless of what NEXTAUTH_URL is set to.
 */
import { getToken as getNextAuthToken, type JWT } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const secureCookie = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

export function getToken(options: { req: NextRequest }): Promise<JWT | null> {
  return getNextAuthToken({ ...options, secureCookie })
}
