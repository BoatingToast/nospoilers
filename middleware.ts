import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_SECRET } from '@/lib/auth-secret'

export async function middleware(req: NextRequest) {
  // Pass the same secret that authOptions uses so Edge-Runtime JWT
  // verification and Node-Runtime JWT signing always agree.
  //
  // Without an explicit secret, getToken() falls back to
  // process.env.NEXTAUTH_SECRET.  When that env-var is absent (e.g.
  // `npm run dev` without Vercel env injection), getToken() returns null
  // even though a valid session cookie is present, causing middleware to
  // redirect every /dashboard visit back to /login while the client-side
  // navbar still shows the user as logged in.
  const token = await getToken({ req, secret: AUTH_SECRET })
  const { pathname } = req.nextUrl

  const isDashboard  = pathname.startsWith('/dashboard')
  const isOnboarding = pathname.startsWith('/onboarding')
  const isProtected  = ['/achievements', '/watchlist', '/history', '/wrapped', '/collections/new', '/ratings']
                         .some(p => pathname.startsWith(p))

  // Not authenticated → login
  if (!token && (isDashboard || isOnboarding || isProtected)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token) {
    // Authenticated but onboarding incomplete → force onboarding
    if (isDashboard && !token.onboardingCompleted) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Already completed onboarding → skip back to dashboard
    if (isOnboarding && token.onboardingCompleted) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding', '/onboarding/:path*',
    '/achievements/:path*',
    '/ratings/:path*',
    '/watchlist/:path*',
    '/history/:path*',
    '/wrapped/:path*',
    '/collections/new',
  ],
}
