import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FindFriends from '@/components/friends/FindFriends'
import SocialHubNav from '@/components/social/SocialHubNav'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find People — NoSpoilers',
  description: 'Find friends and members with compatible movie taste.',
  alternates: { canonical: '/friends/find' },
}

export default async function FindFriendsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Find People"
        lede="Search by username, or discover people with similar movie taste."
        className="mb-6"
      />

      <SocialHubNav active="discover" />
      <FindFriends />
    </div>
  )
}
