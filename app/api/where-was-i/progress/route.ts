import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { setWhereWasIProgress } from '@/services/where-was-i'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimited = await enforceRateLimit(request, {
    scope: 'where-was-i-progress',
    limit: 30,
    windowMs: 10 * 60 * 1_000,
    identifier: `user:${session.user.id}`,
  })
  if (rateLimited) return rateLimited

  let body: { titleSlug?: unknown; checkpointId?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.titleSlug !== 'string' || typeof body.checkpointId !== 'string' ||
      body.titleSlug.length > 120 || body.checkpointId.length > 160) {
    return NextResponse.json({ error: 'A valid title and checkpoint are required.' }, { status: 400 })
  }

  try {
    const data = await setWhereWasIProgress(session.user.id, body.titleSlug, body.checkpointId)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'TITLE_NOT_FOUND') {
      return NextResponse.json({ error: 'Title not found.' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'CHECKPOINT_NOT_FOUND') {
      return NextResponse.json({ error: 'Unsupported checkpoint.' }, { status: 400 })
    }
    throw error
  }
}
