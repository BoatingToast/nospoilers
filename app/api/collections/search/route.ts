import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchCollections, getCollectionSuggestions } from '@/services/collection-community'

// GET /api/collections/search?q=...&suggestions=true&limit=24
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const q           = searchParams.get('q')           ?? ''
  const suggestions = searchParams.get('suggestions') === 'true'
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)

  if (!q.trim()) return NextResponse.json(suggestions ? [] : [])

  try {
    if (suggestions) {
      const results = await getCollectionSuggestions(q, 6)
      return NextResponse.json(results)
    }
    const results = await searchCollections(q, session?.user?.id, limit)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[GET /api/collections/search]', err)
    return NextResponse.json([])
  }
}
