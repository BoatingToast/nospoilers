import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getClientIdentifier } from '@/lib/rate-limit-key'

export interface RateLimitPolicy {
  scope: string
  limit: number
  windowMs: number
  identifier?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

function digestIdentifier(scope: string, identifier: string): string {
  const pepper = process.env.NEXTAUTH_SECRET || 'nospoilers-rate-limit'
  const digest = createHmac('sha256', pepper)
    .update(`${scope}:${identifier.slice(0, 256)}`)
    .digest('hex')
  return `${scope.slice(0, 48)}:${digest}`
}

/**
 * Atomically consumes one request from a fixed window stored in PostgreSQL.
 * This works across serverless instances, unlike an in-memory counter.
 */
export async function consumeRateLimit(
  policy: RateLimitPolicy & { identifier: string },
): Promise<RateLimitResult> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - policy.windowMs)
  const expiresAt = new Date(now.getTime() + policy.windowMs)
  const key = digestIdentifier(policy.scope, policy.identifier)

  const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${now}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${staleBefore} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${staleBefore} THEN ${now}
        ELSE "RateLimitBucket"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${staleBefore} THEN ${expiresAt}
        ELSE "RateLimitBucket"."expiresAt"
      END
    RETURNING "count", "windowStart"
  `

  const bucket = rows[0]
  const count = bucket?.count ?? policy.limit + 1
  const windowStart = bucket?.windowStart ?? now
  const resetAt = new Date(windowStart.getTime() + policy.windowMs)

  // Occasionally clean up without making every new identifier pay for a scan.
  // The authenticated daily cleanup route provides the deterministic fallback.
  if (count === 1 && key.endsWith('00')) {
    await prisma.rateLimitBucket.deleteMany({
      where: { key: { not: key }, expiresAt: { lt: now } },
    }).catch(() => undefined)
  }

  return {
    allowed: count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    resetAt,
  }
}

export async function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
): Promise<NextResponse | null> {
  try {
    const result = await consumeRateLimit({
      ...policy,
      identifier: policy.identifier ?? getClientIdentifier(request),
    })
    if (result.allowed) return null

    const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
          'Cache-Control': 'private, no-store',
        },
      },
    )
  } catch (error) {
    // A limiter outage must not become an application-wide outage. CI verifies
    // the table exists; runtime database failures are logged and fail open.
    console.error(`[rate-limit:${policy.scope}]`, error)
    return null
  }
}
