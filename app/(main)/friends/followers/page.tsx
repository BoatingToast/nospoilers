import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import SocialListPage from '@/components/social/SocialListPage'

export const metadata: Metadata = {
  title: 'Followers — NoSpoilers',
  description: 'See who follows your NoSpoilers movie profile.',
  alternates: { canonical: '/friends/followers' },
}

export default async function FollowersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader title="Followers" description="People who follow your movie activity and recommendations." />
      <div className="mt-8">
        <SocialListPage mode="followers" embedded />
      </div>
    </div>
  )
}
