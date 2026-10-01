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
import Section from '@/components/ui/Section'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Friends — NoSpoilers',
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Friends"
        lede={<>{friendCount} friend{friendCount !== 1 ? 's' : ''} · Discover movies through people you trust</>}
        className="mb-6"
      >
        <Button variant="primary" href="/friends/find" className="w-full sm:w-auto">
          Find people
        </Button>
      </PageHeader>

      <SocialHubNav active="friends" />

      {/* Pending requests */}
      {pending.received.length > 0 && (
        <Section
          title="Friend Requests"
          action={<span className="font-body text-sm text-ns-muted">{pending.received.length} waiting</span>}
          className="mb-10"
        >
          <div className="border-b border-ns-border">
            {pending.received.map(req => (
              <PendingRequestRow key={req.requestId} req={req} />
            ))}
          </div>
        </Section>
      )}

      <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-10">
          {/* Friend-based recs */}
          {friendCount > 0 && <FriendRecs />}

          {/* Canonical searchable friends directory. */}
          <Section title="Your Friends">
            <SocialListPage mode="friends" embedded showNavigation={false} />
          </Section>
        </div>

        {/* Activity Feed */}
        <Section title="Friend Activity">
          <FriendsFeed />
        </Section>
      </div>
    </div>
  )
}

function PendingRequestRow({ req }: { req: { requestId: string; username: string; avatarUrl: string | null; sentAt: string } }) {
  // This is a server component — buttons need to be client-side
  // We'll render this as a link to avoid making the whole page client
  return (
    <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-3 border-t border-ns-border py-3">
      <Link href={`/profile/${req.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar src={req.avatarUrl} username={req.username} size="sm" />
        <span className="truncate font-body text-sm text-ns-text">@{req.username}</span>
      </Link>
      <PendingActions requestId={req.requestId} username={req.username} />
    </div>
  )
}

// Client component for accept/reject buttons
import PendingActions from '@/components/friends/PendingActions'
