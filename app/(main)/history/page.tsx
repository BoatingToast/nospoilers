import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/watchlist'
import HistoryTimeline from '@/components/watchlist/HistoryTimeline'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

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
  const avgRating    = watched.filter(m => m.rating).reduce((sum, m, _, arr) => sum + (m.rating ?? 0) / arr.length, 0)

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <PageHeader
        className="mb-10"
        title="Watch history."
        actions={watched.length > 0 ? (
          <dl className="flex gap-8">
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-sm text-ns-muted">Films watched</dt>
              <dd className="font-display text-4xl tabular-nums text-ns-text">{watched.length}</dd>
            </div>
            {avgRating > 0 && (
              <div className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-ns-muted">Avg rating</dt>
                <dd className="font-display text-4xl tabular-nums text-ns-text">{avgRating.toFixed(1)}</dd>
              </div>
            )}
          </dl>
        ) : undefined}
      />

      {watched.length === 0 ? (
        <EmptyState
          title="No watched movies yet"
          description="Mark movies as watched from your watchlist."
          action={<Button href="/watchlist">Open your watchlist</Button>}
        />
      ) : (
        <HistoryTimeline byMonth={byMonth} />
      )}
    </div>
  )
}
