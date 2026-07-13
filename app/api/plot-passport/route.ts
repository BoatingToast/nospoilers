import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/watchlist'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getWatchlist(session.user.id, { sortBy: 'title' })
  const protectedTitles = items
    .filter(item => item.progressPercent < 100)
    .map(item => item.title)

  return NextResponse.json({
    items,
    protectedTitles,
    stats: {
      protected: protectedTitles.length,
      inProgress: items.filter(item => item.progressPercent > 0 && item.progressPercent < 100).length,
      cleared: items.filter(item => item.progressPercent === 100).length,
    },
  })
}
