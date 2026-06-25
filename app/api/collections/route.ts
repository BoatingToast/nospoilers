import { NextRequest, NextResponse } from 'next/server'
import { getToken }                  from 'next-auth/jwt'
import { getPublicCollections, getUserCollections, createCollection } from '@/services/collections'
import {
  getPopularCollections,
  getNewestCollections,
  getMostUpvotedCollections,
  getMostMoviesCollections,
  getFollowingCollections,
} from '@/services/collection-community'

// GET /api/collections
//   ?mine=true          → user's own collections
//   ?tab=popular|newest|most_upvoted|most_movies|following
//   (default)           → public collections (legacy)
export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  const { searchParams } = new URL(req.url)
  const mine  = searchParams.get('mine') === 'true'
  const tab   = searchParams.get('tab')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)

  // ── My collections ────────────────────────────────────────────────────────
  const uid = ((token?.id ?? token?.sub) as string | undefined)

  if (mine) {
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const cols = await getUserCollections(uid)
    return NextResponse.json(cols)
  }

  // ── Tabbed community views ────────────────────────────────────────────────
  try {
    switch (tab) {
      case 'popular':      return NextResponse.json(await getPopularCollections(uid, limit))
      case 'newest':       return NextResponse.json(await getNewestCollections(uid, limit))
      case 'most_upvoted': return NextResponse.json(await getMostUpvotedCollections(uid, limit))
      case 'most_movies':  return NextResponse.json(await getMostMoviesCollections(uid, limit))
      case 'following': {
        if (!uid) return NextResponse.json([])
        return NextResponse.json(await getFollowingCollections(uid, limit))
      }
      default: {
        // Legacy: plain public collections list (used by CollectionPickerModal)
        const cols = await getPublicCollections()
        return NextResponse.json(cols)
      }
    }
  } catch (err) {
    console.error('[GET /api/collections]', err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  const uid   = (token?.id ?? token?.sub) as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, isPublic } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const col = await createCollection(uid, { title: title.trim(), description, isPublic })
  return NextResponse.json(col, { status: 201 })
}
