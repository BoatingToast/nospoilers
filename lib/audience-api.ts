import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasAdminAccess } from '@/lib/admin-access'
import { AudienceError, requireSameOrigin } from '@/lib/audience-engine'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function audienceUser(admin = false) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new AudienceError('Sign in to use Audience Engine.', 401)
  // Re-read authorization on every request. A stale or client-modified JWT
  // never grants access to platform analytics, review, or dataset downloads.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isAdmin: true },
  })
  if (!user) throw new AudienceError('Sign in again to continue.', 401)
  if (admin && !hasAdminAccess(user))
    throw new AudienceError('Administrator access is required.', 403)
  return user
}

export function audienceJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

export function audienceApiError(error: unknown) {
  if (error instanceof AudienceError) return audienceJson({ error: error.message }, error.status)
  if (error instanceof SyntaxError) return audienceJson({ error: 'Provide valid JSON.' }, 400)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    return audienceJson({ error: 'This record is no longer available.' }, 404)
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2021', 'P2022'].includes(error.code)
  )
    return audienceJson(
      {
        error: 'Audience Engine needs its database migration. Please contact the administrator.',
        code: 'MIGRATION_REQUIRED',
      },
      503,
    )
  console.error('[audience-engine]', error instanceof Error ? error.name : 'Unknown error')
  return audienceJson({ error: 'Audience data is temporarily unavailable. Please try again.' }, 503)
}

export async function audienceMutation(
  request: Request,
  userId: string,
  scope: string,
  limit = 60,
) {
  requireSameOrigin(request)
  const size = Number(request.headers.get('content-length') ?? 0)
  if (size > 32_768) throw new AudienceError('This request is too large.', 413)
  return enforceRateLimit(request, {
    scope: `audience-${scope}`,
    identifier: `user:${userId}`,
    limit,
    windowMs: 60_000,
  })
}

export async function audienceBody(request: Request) {
  const text = await request.text()
  if (text.length > 32_768) throw new AudienceError('This request is too large.', 413)
  return JSON.parse(text) as unknown
}
