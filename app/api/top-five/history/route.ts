import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTopFiveHistory, restoreTopFive } from '@/services/top-five'

// GET /api/top-five/history
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const history = await getTopFiveHistory(session.user.id)
  return NextResponse.json({ history })
}

// POST /api/top-five/history   body: { snapshotId: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { snapshotId } = await req.json()
  if (!snapshotId) return NextResponse.json({ error: 'snapshotId required' }, { status: 400 })

  await restoreTopFive(session.user.id, snapshotId)
  return NextResponse.json({ ok: true })
}
