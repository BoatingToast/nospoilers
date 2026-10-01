import { NextResponse } from 'next/server'
import { requireProMember } from '@/lib/pro-session'
import { getStoryText, type StoryMode } from '@/services/taste-reasons'

export const runtime = 'nodejs'

const PRIVATE = { 'Cache-Control': 'private, no-store' }

// GET /api/pro/taste-reasons/story?ids=1,2,3&mode=safe|standard[&demo=1]
// Premise text for the current picks. Blind mode never requests this.
export async function GET(request: Request) {
  const member = await requireProMember()
  if ('denied' in member) return member.denied

  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  if (mode !== 'safe' && mode !== 'standard') {
    return NextResponse.json({ message: 'Choose Safe or Standard to load story details.' }, { status: 400, headers: PRIVATE })
  }
  const ids = [...new Set(
    (params.get('ids') ?? '').split(',').map(Number).filter(id => Number.isInteger(id) && id > 0),
  )].slice(0, 3)
  if (ids.length === 0) return NextResponse.json({ stories: {} }, { headers: PRIVATE })

  const stories = await getStoryText(ids, mode as StoryMode, params.get('demo') === '1')
  return NextResponse.json({ stories }, { headers: PRIVATE })
}
