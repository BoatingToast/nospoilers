import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="mb-1 text-[10px] font-body uppercase tracking-[0.18em] text-ns-secondary-readable">Your network</p>
        <h1 className="font-display text-4xl tracking-wider text-ns-text sm:text-5xl">FOLLOWING</h1>
        <p className="mt-2 text-sm font-body text-ns-muted">People whose movie activity you keep up with.</p>
      </header>
      <SocialListPage mode="following" embedded />
    </div>
  )
}
