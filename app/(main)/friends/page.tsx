import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPendingRequests } from '@/services/friends'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs from '@/components/friends/FriendRecs'
import SocialHubNav from '@/components/social/SocialHubNav'
import SocialListPage from '@/components/social/SocialListPage'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Friends',
  description: 'Manage friends, requests, followers, and movie-taste connections in one place.',
  alternates: { canonical: '/friends' },
}

export default async function FriendsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [friendCount, pending] = await Promise.all([
    prisma.friendship.count({
      where: { OR: [{ userAId: session.user.id }, { userBId: session.user.id }] },
    }),
    getPendingRequests(session.user.id),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader
        title="Friends"
        description={`${friendCount} friend${friendCount !== 1 ? 's' : ''} · Discover movies through people you trust`}
        actions={<Button href="/friends/find">Find people</Button>}
      />

      <div className="mt-8">
        <SocialHubNav active="friends" />
      </div>

      {/* Pending requests */}
      {pending.received.length > 0 && (
        <section className="mt-8 rounded-2xl bg-ns-tile-rose p-6">
          <h2 className="font-heading text-xl font-bold text-ns-text">
            Friend requests <span className="ml-1 font-body text-base font-semibold tabular-nums text-ns-muted">{pending.received.length}</span>
          </h2>
          <div className="mt-4 divide-y divide-ns-border">
            {pending.received.map(req => (
              <PendingRequestRow key={req.requestId} req={req} />
            ))}
          </div>
        </section>
      )}

      {/* Friend-based recs */}
      {friendCount > 0 && (
        <div className="mt-12">
          <FriendRecs />
        </div>
      )}

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Canonical searchable friends directory. */}
        <section aria-labelledby="friends-directory" className="min-w-0">
          <h2 id="friends-directory" className="mb-4 font-display text-2xl text-ns-text sm:text-3xl">Your friends</h2>
          <SocialListPage mode="friends" embedded showNavigation={false} />
        </section>

        {/* Activity Feed */}
        <section aria-labelledby="friends-activity" className="ns-reveal min-w-0">
          <h2 id="friends-activity" className="mb-4 font-display text-2xl text-ns-text sm:text-3xl">Friend activity</h2>
          <FriendsFeed />
        </section>
      </div>
    </div>
  )
}

function PendingRequestRow({ req }: { req: { requestId: string; username: string; avatarUrl: string | null; sentAt: string } }) {
  // This is a server component — buttons need to be client-side
  // We'll render this as a link to avoid making the whole page client
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <Link href={`/profile/${req.username}`} className="flex min-h-11 min-w-0 items-center gap-3">
        <Avatar src={req.avatarUrl} username={req.username} size="sm" />
        <span className="truncate text-base font-semibold text-ns-text">@{req.username}</span>
      </Link>
      <PendingActions requestId={req.requestId} username={req.username} />
    </div>
  )
}

// Client component for accept/reject buttons
import PendingActions from '@/components/friends/PendingActions'
