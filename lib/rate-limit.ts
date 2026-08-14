interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitStore {
  entries: Map<string, RateLimitEntry>
  checks: number
}

const globalRateLimit = globalThis as typeof globalThis & {
  __nospoilersRateLimit?: RateLimitStore
}

const store = globalRateLimit.__nospoilersRateLimit ?? {
  entries: new Map<string, RateLimitEntry>(),
  checks: 0,
}

if (process.env.NODE_ENV !== 'production') {
  globalRateLimit.__nospoilersRateLimit = store
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = store.entries.get(key)
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current

  entry.count += 1
  store.entries.set(key, entry)
  store.checks += 1

  if (store.checks % 250 === 0) {
    for (const [entryKey, value] of store.entries) {
      if (value.resetAt <= now) store.entries.delete(entryKey)
    }
  }

  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  }
}

export function requestClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown-client'
}
