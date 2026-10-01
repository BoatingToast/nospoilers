import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/watchlist'
import HistoryTimeline from '@/components/watchlist/HistoryTimeline'
import type { Metadata } from 'next'
import PageHeader from '@/components/ui/PageHeader'

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
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        title="WATCH HISTORY"
        lede="Every film you have marked as watched, month by month."
      />

      <dl className="mb-10 grid grid-cols-2 gap-x-6 border-b border-ns-border sm:grid-cols-4">
        <div className="py-4">
          <dd className="font-display text-3xl leading-none tracking-wider text-ns-secondary-readable">{watched.length}</dd>
          <dt className="mt-1 text-ns-muted text-xs font-body">Films Watched</dt>
        </div>
        {avgRating > 0 && (
          <div className="py-4">
            <dd className="font-display text-3xl leading-none tracking-wider text-ns-text">{avgRating.toFixed(1)}</dd>
            <dt className="mt-1 text-ns-muted text-xs font-body">Avg Rating</dt>
          </div>
        )}
      </dl>

      {watched.length === 0 ? (
        <p className="border-t-2 border-ns-text pt-4 text-ns-muted font-body text-sm">
          No watched movies yet. Mark movies as watched from your watchlist.
        </p>
      ) : (
        <HistoryTimeline byMonth={byMonth} />
      )}
    </div>
  )
}
