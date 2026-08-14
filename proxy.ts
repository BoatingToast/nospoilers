// Auth is handled at the page/layout level via getServerSession(authOptions)
// because getToken() does not reliably verify JWTs in the Vercel Edge Runtime
// for this Next.js 16 + NextAuth v4 setup.
//
// This proxy is intentionally left minimal — it does no auth checks. Protected
// pages redirect to /login themselves using getServerSession.

export function proxy() {}

export const config = {
  matcher: [],
}
