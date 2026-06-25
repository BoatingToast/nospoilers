import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRelatedCollections } from '@/services/collection-community'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/collections/:id/related
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const { id: collectionId } = await params

  try {
    const related = await getRelatedCollections(collectionId, session?.user?.id)
    return NextResponse.json(related)
  } catch (err) {
    console.error('[GET /api/collections/[id]/related]', err)
    return NextResponse.json([])
  }
}
