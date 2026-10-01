import { NextResponse } from 'next/server'
import { requireProMember } from '@/lib/pro-session'
import { enforceRateLimit } from '@/lib/rate-limit'
import { tasteAiConfigured } from '@/services/taste-llm'
import {
  forgetTasteProfile,
  getFixtureBootstrap,
  getTasteBootstrap,
  saveTasteProfile,
} from '@/services/taste-reasons'

export const runtime = 'nodejs'

const PRIVATE = { 'Cache-Control': 'private, no-store' }

// GET /api/pro/taste-reasons[?demo=1]
// Everything the Taste Lab experience needs to run in the browser: rated films
// and candidates with their taste facets, plus any saved profile.
export async function GET(request: Request) {
  const member = await requireProMember()
  if ('denied' in member) return member.denied

  const demo = new URL(request.url).searchParams.get('demo') === '1'
  try {
    const bootstrap = demo ? getFixtureBootstrap() : await getTasteBootstrap(member.userId)
    return NextResponse.json(
      { ...bootstrap, ai: tasteAiConfigured() ? 'live' : 'fixture' },
      { headers: PRIVATE },
    )
  } catch (error) {
    console.error('[pro/taste-reasons]', error)
    return NextResponse.json({ message: 'Taste Lab could not load your ratings.' }, { status: 500, headers: PRIVATE })
  }
}

// PUT /api/pro/taste-reasons
// Explicit save of what the member taught Taste Lab this session.
export async function PUT(request: Request) {
  const member = await requireProMember()
  if ('denied' in member) return member.denied

  const limited = await enforceRateLimit(request, {
    scope: 'pro-taste-save',
    limit: 12,
    windowMs: 10 * 60 * 1_000,
    identifier: `user:${member.userId}`,
  })
  if (limited) return limited

  const body = await request.json().catch(() => null) as { state?: unknown; keepTweak?: unknown } | null
  if (!body?.state || typeof body.state !== 'object') {
    return NextResponse.json({ message: 'Nothing to save.' }, { status: 400, headers: PRIVATE })
  }

  try {
    const result = await saveTasteProfile(member.userId, body.state, { keepTweak: body.keepTweak === true })
    return NextResponse.json(result, { status: result.saved ? 200 : 503, headers: PRIVATE })
  } catch (error) {
    console.error('[pro/taste-reasons] save', error)
    return NextResponse.json({ message: 'Could not save your taste profile.' }, { status: 500, headers: PRIVATE })
  }
}

// DELETE /api/pro/taste-reasons
// Forget the saved profile and restore the preferences it replaced.
export async function DELETE() {
  const member = await requireProMember()
  if ('denied' in member) return member.denied

  try {
    return NextResponse.json(await forgetTasteProfile(member.userId), { headers: PRIVATE })
  } catch (error) {
    console.error('[pro/taste-reasons] forget', error)
    return NextResponse.json({ message: 'Could not clear your taste profile.' }, { status: 500, headers: PRIVATE })
  }
}
