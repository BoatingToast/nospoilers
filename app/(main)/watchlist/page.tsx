import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist, getWatchlistStats } from '@/services/watchlist'
import WatchlistGrid from '@/components/watchlist/WatchlistGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Watchlist — NoSpoilers' }

interface Props {
  searchParams: Promise<{ status?: string; sortBy?: string }>
}

export default async function WatchlistPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const sp     = await searchParams
  const status = sp.status as any ?? undefined
  const sortBy = sp.sortBy ?? 'addedAt'

  const [items, stats] = await Promise.all([
    getWatchlist(session.user.id, { status, sortBy }),
    getWatchlistStats(session.user.id),
  ])

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Personal</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-2">
            MY WATCHLIST
          </h1>

          {/* Stats row */}
          <div className="flex gap-6 mt-4">
            {[
              { label: 'Total',         value: stats.total,       color: 'text-ns-text' },
              { label: 'Want to Watch', value: stats.wantToWatch, color: 'text-ns-muted' },
              { label: 'Watching',      value: stats.watching,    color: 'text-ns-gold' },
              { label: 'Watched',       value: stats.watched,     color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label}>
                <p className={`font-display text-3xl tracking-wider ${s.color}`}>{s.value}</p>
                <p className="text-ns-muted text-xs font-body">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <WatchlistGrid initialItems={items} initialStatus={status ?? 'all'} initialSortBy={sortBy} />
      </div>
    </div>
  )
}
