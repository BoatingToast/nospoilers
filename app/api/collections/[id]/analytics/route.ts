import { NextRequest, NextResponse }      from 'next/server'
import { getToken }                       from 'next-auth/jwt'
import { getCreatorAnalytics }            from '@/services/collection-community'
import { prisma }                         from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/collections/:id/analytics  — creator analytics for a specific collection
// (returns full creator-level stats; collectionId is used to verify ownership)
export async function GET(req: NextRequest, { params }: Ctx) {
  const token = await getToken({ req })
  const uid   = ((token?.id ?? token?.sub) as string | undefined)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: collectionId } = await params

  // Verify the requesting user owns this collection
  const col = await prisma.collection.findUnique({
    where:  { id: collectionId },
    select: { userId: true },
  })
  if (!col || col.userId !== uid)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const analytics = await getCreatorAnalytics(uid)
    return NextResponse.json(analytics)
  } catch (err) {
    console.error('[GET /api/collections/[id]/analytics]', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
