import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { previewTopFiveDNA } from '@/services/top-five'

// POST /api/top-five/preview   body: { movies: TopFiveEntry[] }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movies } = await req.json()
  if (!Array.isArray(movies)) {
    return NextResponse.json({ error: 'movies array required' }, { status: 400 })
  }

  const preview = await previewTopFiveDNA(session.user.id, movies)
  if (!preview) return NextResponse.json({ error: 'No taste profile found' }, { status: 404 })

  return NextResponse.json(preview)
}
