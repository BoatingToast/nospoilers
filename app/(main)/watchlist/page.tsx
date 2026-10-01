import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist, getWatchlistStats } from '@/services/watchlist'
import WatchlistGrid from '@/components/watchlist/WatchlistGrid'
import type { Metadata } from 'next'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'

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
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        title="MY WATCHLIST"
        lede="Your personal queue: everything you want to watch, are watching, or have finished."
      >
        <Button variant="secondary" href="/plot-passport">
          Open Plot Passport
        </Button>
      </PageHeader>

      {/* Stats row */}
      <dl className="mb-10 grid grid-cols-2 gap-x-6 border-b border-ns-border sm:grid-cols-4">
        {[
          { label: 'Total',         value: stats.total,       color: 'text-ns-text' },
          { label: 'Want to Watch', value: stats.wantToWatch, color: 'text-ns-muted' },
          { label: 'Watching',      value: stats.watching,    color: 'text-ns-secondary-readable' },
          { label: 'Watched',       value: stats.watched,     color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="py-4">
            <dd className={`font-display text-3xl leading-none tracking-wider ${s.color}`}>{s.value}</dd>
            <dt className="mt-1 text-ns-muted text-xs font-body">{s.label}</dt>
          </div>
        ))}
      </dl>

      <WatchlistGrid initialItems={items} initialStatus={status ?? 'all'} initialSortBy={sortBy} />
    </div>
  )
}
