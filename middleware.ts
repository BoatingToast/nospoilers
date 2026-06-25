import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { JWT } from 'next-auth/jwt'

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    const isDashboard  = pathname.startsWith('/dashboard')
    const isOnboarding = pathname.startsWith('/onboarding')

    if (token) {
      if (isDashboard && !token.onboardingCompleted) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
      if (isOnboarding && token.onboardingCompleted) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Return true = allow through (withAuth handles the login redirect when false)
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

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
