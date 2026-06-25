import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
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
