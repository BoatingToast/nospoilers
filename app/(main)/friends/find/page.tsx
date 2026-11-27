import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FindFriends from '@/components/friends/FindFriends'
import SocialHubNav from '@/components/social/SocialHubNav'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find People',
  description: 'Find friends and members with compatible movie taste.',
  alternates: { canonical: '/friends/find' },
}

export default async function FindFriendsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader
        title="Find people"
        description="Search by username, or discover people with similar movie taste."
      />
      <div className="mb-6 mt-8">
        <SocialHubNav active="discover" />
      </div>
      <FindFriends />
    </div>
  )
}
