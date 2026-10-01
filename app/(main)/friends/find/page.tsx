import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FindFriends from '@/components/friends/FindFriends'
import SocialHubNav from '@/components/social/SocialHubNav'
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">Social</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text">Find People</h1>
        <p className="text-ns-muted text-sm font-body mt-2">
          Search by username, or discover people with similar movie taste.
        </p>
      </div>

      <SocialHubNav active="discover" />
      <FindFriends />
    </div>
  )
}
