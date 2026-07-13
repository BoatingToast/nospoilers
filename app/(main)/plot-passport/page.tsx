import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWatchlist } from '@/services/watchlist'
import PlotPassportClient from '@/components/plot-passport/PlotPassportClient'

export const metadata: Metadata = {
  title: 'Plot Passport — NoSpoilers',
  description: 'Your personal spoiler boundary across NoSpoilers and the web.',
}

export default async function PlotPassportPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const items = await getWatchlist(session.user.id, { sortBy: 'title' })
  return <PlotPassportClient initialItems={items} />
}
