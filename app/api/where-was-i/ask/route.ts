import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { answerWhereWasIQuestion } from '@/services/where-was-i'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimited = await enforceRateLimit(request, {
    scope: 'where-was-i-ask',
    limit: 20,
    windowMs: 10 * 60 * 1_000,
    identifier: `user:${session.user.id}`,
  })
  if (rateLimited) return rateLimited

  let body: { titleSlug?: unknown; question?: unknown; characterId?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.titleSlug !== 'string' || body.titleSlug.length > 120 ||
      typeof body.question !== 'string' || !body.question.trim() || body.question.length > 500 ||
      (body.characterId !== undefined && (typeof body.characterId !== 'string' || body.characterId.length > 160))) {
    return NextResponse.json({ error: 'Provide a valid question of 500 characters or fewer.' }, { status: 400 })
  }

  try {
    const result = await answerWhereWasIQuestion(
      session.user.id,
      body.titleSlug,
      body.question,
      typeof body.characterId === 'string' ? body.characterId : undefined,
    )
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'TITLE_NOT_FOUND') return NextResponse.json({ error: 'Title not found.' }, { status: 404 })
    if (code === 'PROGRESS_REQUIRED') {
      return NextResponse.json({ error: 'Confirm your viewing progress before asking a question.' }, { status: 409 })
    }
    if (code === 'CHARACTER_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'That character is not established at your selected progress.' }, { status: 400 })
    }
    if (code === 'BOUNDARY_CHANGED') {
      return NextResponse.json({ error: 'Your progress changed while that answer was being checked. Please ask again.' }, { status: 409 })
    }
    if (code === 'INVALID_QUESTION') return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
    throw error
  }
}
