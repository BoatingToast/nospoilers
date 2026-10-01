import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import SocialListPage from '@/components/social/SocialListPage'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Following — NoSpoilers',
  description: 'Manage the movie fans and creators you follow on NoSpoilers.',
  alternates: { canonical: '/friends/following' },
}

export default async function FollowingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="FOLLOWING" lede="People whose movie activity you keep up with." className="mb-6" />
      <SocialListPage mode="following" embedded />
    </div>
  )
}
