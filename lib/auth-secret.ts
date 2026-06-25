/**
 * Shared NextAuth JWT secret — safe to import in Edge Runtime.
 *
 * This file has NO Node.js-only imports so it can be used in both
 * the middleware (Edge Runtime) and the API routes / authOptions (Node.js).
 *
 * Why this exists:
 *   getToken({ req }) in middleware resolves the secret from
 *   process.env.NEXTAUTH_SECRET.  When that env-var is absent
 *   (e.g. `npm run dev` without Vercel env injection), getToken()
 *   cannot verify the JWT and returns null, while the Node.js
 *   NextAuth API route uses its own internal fallback — causing a
 *   secret mismatch.  The result: session cookie is valid on the
 *   client (navbar shows logged-in) but every protected-route
 *   visit is bounced back to /login by the middleware.
 *
 *   By exporting one constant and using it in BOTH authOptions.secret
 *   and getToken({ secret }), signing and verification always use the
 *   same value regardless of runtime.
 *
 * Production: set NEXTAUTH_SECRET to a strong random string.
 */
export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? 'nospoilers-dev-secret-set-NEXTAUTH_SECRET-in-env'
