import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import SocialListPage from '@/components/social/SocialListPage'

export const metadata: Metadata = {
  title: 'Following — NoSpoilers',
  description: 'Manage the movie fans and creators you follow on NoSpoilers.',
  alternates: { canonical: '/friends/following' },
}

export default async function FollowingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader title="Following" description="People whose movie activity you keep up with." />
      <div className="mt-8">
        <SocialListPage mode="following" embedded />
      </div>
    </div>
  )
}
