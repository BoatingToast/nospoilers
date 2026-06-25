import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTopFive, saveTopFive } from '@/services/top-five'

// GET /api/top-five            (own list)
// GET /api/top-five?userId=xxx (public view — for profiles)
export async function GET(req: NextRequest) {
  const targetUserId = req.nextUrl.searchParams.get('userId')

  if (targetUserId) {
    const movies = await getTopFive(targetUserId)
    return NextResponse.json({ movies })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const movies = await getTopFive(session.user.id)
  return NextResponse.json({ movies })
}

// PUT /api/top-five   body: { movies: TopFiveEntry[] }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movies } = await req.json()

  if (!Array.isArray(movies) || movies.length === 0 || movies.length > 5) {
    return NextResponse.json({ error: 'Provide 1–5 movies' }, { status: 400 })
  }

  // Validate positions are 1–5 and unique
  const positions = movies.map((m: { position: number }) => m.position)
  if (positions.some((p: number) => p < 1 || p > 5)) {
    return NextResponse.json({ error: 'Positions must be 1–5' }, { status: 400 })
  }
  if (new Set(positions).size !== positions.length) {
    return NextResponse.json({ error: 'Duplicate positions' }, { status: 400 })
  }

  await saveTopFive(session.user.id, movies)
  return NextResponse.json({ ok: true })
}
