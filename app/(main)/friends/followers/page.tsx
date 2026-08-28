import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="mb-1 text-[10px] font-body uppercase tracking-[0.18em] text-ns-secondary-readable">Your network</p>
        <h1 className="font-display text-4xl tracking-wider text-ns-text sm:text-5xl">FOLLOWERS</h1>
        <p className="mt-2 text-sm font-body text-ns-muted">People who follow your movie activity and recommendations.</p>
      </header>
      <SocialListPage mode="followers" embedded />
    </div>
  )
}
