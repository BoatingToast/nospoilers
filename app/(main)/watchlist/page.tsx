import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist, getWatchlistStats } from '@/services/watchlist'
import WatchlistGrid from '@/components/watchlist/WatchlistGrid'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
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
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <PageHeader
        className="mb-10"
        title="My watchlist."
        actions={<Button href="/plot-passport" variant="outline">Open Plot Passport</Button>}
      />
      <WatchlistGrid initialItems={items} initialStatus={status ?? 'all'} initialSortBy={sortBy} stats={stats} />
    </div>
  )
}
