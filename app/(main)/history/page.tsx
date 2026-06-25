import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/watchlist'
import HistoryTimeline from '@/components/watchlist/HistoryTimeline'
import type { Metadata } from 'next'
import { FilmIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Watch History — NoSpoilers' }

export default async function HistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const watched = await getWatchlist(session.user.id, { status: 'watched', sortBy: 'watchedAt' })

  // Group by month
  const byMonth: Record<string, typeof watched> = {}
  for (const item of watched) {
    const date  = item.watchedAt ?? item.addedAt
    const key   = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(item)
  }

  // Stats
  const totalRuntime = watched.reduce((sum, m) => sum + 0, 0) // runtime not always available
  const avgRating    = watched.filter(m => m.rating).reduce((sum, m, _, arr) => sum + (m.rating ?? 0) / arr.length, 0)

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Personal</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-4">
            WATCH HISTORY
          </h1>
          <div className="flex gap-6">
            <div>
              <p className="font-display text-3xl tracking-wider text-ns-gold">{watched.length}</p>
              <p className="text-ns-muted text-xs font-body">Films Watched</p>
            </div>
            {avgRating > 0 && (
              <div>
                <p className="font-display text-3xl tracking-wider text-ns-text">{avgRating.toFixed(1)}</p>
                <p className="text-ns-muted text-xs font-body">Avg Rating</p>
              </div>
            )}
          </div>
        </div>

        {watched.length === 0 ? (
          <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
            <FilmIcon size={52} className="text-ns-gold/40 mx-auto mb-4" />
            <p className="text-ns-muted font-body text-sm">
              No watched movies yet. Mark movies as watched from your watchlist.
            </p>
          </div>
        ) : (
          <HistoryTimeline byMonth={byMonth} />
        )}
      </div>
    </div>
  )
}
