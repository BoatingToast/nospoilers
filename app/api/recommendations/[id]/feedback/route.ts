import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addToWatchlist, updateWatchlistItem } from '@/services/watchlist'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: recommendationId } = await params
  const { feedback } = await req.json() as { feedback: 'liked' | 'dismissed' | 'watched' | 'not_interested' }

  if (!['liked', 'dismissed', 'watched', 'not_interested'].includes(feedback)) {
    return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
  }

  // Verify this recommendation belongs to the user
  const rec = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: { userId: true, tmdbId: true, title: true, posterPath: true, releaseDate: true },
  })
  if (!rec || rec.userId !== session.user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.recommendationFeedback.upsert({
    where:  { recommendationId },
    create: { userId: session.user.id, recommendationId, feedback },
    update: { feedback },
  })

  // If feedback is 'watched', add to watchlist via service so XP, achievements,
  // and activity log are all triggered correctly.
  if (feedback === 'watched') {
    try {
      const userId = session.user.id
      // Check if already on watchlist
      const existing = await prisma.watchlistItem.findUnique({
        where: { userId_tmdbId: { userId, tmdbId: rec.tmdbId } },
        select: { status: true },
      })
      if (existing) {
        // Already on watchlist — just update status to watched (triggers XP + achievements)
        await updateWatchlistItem(userId, rec.tmdbId, { status: 'watched' })
      } else {
        // Not on watchlist — add it as want_to_watch first, then mark watched
        // so the achievement progress fires via updateWatchlistItem
        await addToWatchlist(userId, {
          tmdbId: rec.tmdbId,
          title: rec.title,
          posterPath: rec.posterPath,
          releaseDate: rec.releaseDate,
          genreIds: [],
        }, 'want_to_watch')
        await updateWatchlistItem(userId, rec.tmdbId, { status: 'watched' })
      }
    } catch {
      // Don't fail the feedback request if watchlist update errors
    }
  }

  return NextResponse.json({ success: true })
}
