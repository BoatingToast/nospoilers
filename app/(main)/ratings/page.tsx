import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserRatings, getRatingStats } from '@/services/ratings'
import RatingsClient from './RatingsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Ratings — NoSpoilers' }

export default async function RatingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [{ items, total }, stats] = await Promise.all([
    getUserRatings(session.user.id, { page: 1, limit: 50, sortBy: 'date' }),
    getRatingStats(session.user.id),
  ])

  return <RatingsClient initialItems={items} total={total} stats={stats} />
}
