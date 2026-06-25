import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrendingCollections } from '@/services/collection-community'

// GET /api/collections/trending?limit=24
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)

  try {
    const collections = await getTrendingCollections(session?.user?.id, limit)
    return NextResponse.json(collections)
  } catch (err) {
    console.error('[GET /api/collections/trending]', err)
    return NextResponse.json([], { status: 500 })
  }
}
