import { NextRequest, NextResponse }      from 'next/server'
import { getServerSession }               from 'next-auth'
import { authOptions }                    from '@/lib/auth'
import { getCreatorAnalytics }            from '@/services/collection-community'
import { prisma }                         from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const uid     = session?.user?.id as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: collectionId } = await params

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
