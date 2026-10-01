import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import SocialListPage from '@/components/social/SocialListPage'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Followers — NoSpoilers',
  description: 'See who follows your NoSpoilers movie profile.',
  alternates: { canonical: '/friends/followers' },
}

export default async function FollowersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="FOLLOWERS" lede="People who follow your movie activity and recommendations." className="mb-6" />
      <SocialListPage mode="followers" embedded />
    </div>
  )
}
