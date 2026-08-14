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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading text-white mb-1">Friends</h1>
          <p className="text-ns-muted text-sm font-body">
            {friendCount} friend{friendCount !== 1 ? 's' : ''} · Discover movies through people you trust
          </p>
        </div>
        <Link
          href="/friends/find"
          className="px-5 py-2.5 rounded-xl bg-ns-secondary text-ns-bg text-sm font-body font-medium hover:bg-amber-400 transition-colors flex-shrink-0"
        >
          Find people
        </Link>
      </div>

      <SocialHubNav active="friends" />

      {/* Pending requests */}
      {pending.received.length > 0 && (
        <div className="mb-8 bg-ns-surface border border-ns-secondary/20 rounded-2xl p-5">
          <p className="text-ns-secondary text-xs tracking-widest uppercase font-body mb-4">
            Friend Requests · {pending.received.length}
          </p>
          <div className="space-y-3">
            {pending.received.map(req => (
              <PendingRequestRow key={req.requestId} req={req} />
            ))}
          </div>
        </div>
      )}

      {/* Friend-based recs */}
      {friendCount > 0 && (
        <div className="mb-8">
          <FriendRecs />
        </div>
      )}

      {/* Canonical searchable friends directory. */}
      <div className="mb-8">
        <SocialListPage mode="friends" embedded showNavigation={false} />
      </div>

      {/* Activity Feed */}
      <div>
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Friend Activity</p>
        <FriendsFeed />
      </div>
    </div>
  )
}

function PendingRequestRow({ req }: { req: { requestId: string; username: string; avatarUrl: string | null; sentAt: string } }) {
  // This is a server component — buttons need to be client-side
  // We'll render this as a link to avoid making the whole page client
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/profile/${req.username}`} className="flex items-center gap-2">
        <Avatar src={req.avatarUrl} username={req.username} size="sm" />
        <span className="text-sm font-body text-white">@{req.username}</span>
      </Link>
      <PendingActions requestId={req.requestId} username={req.username} />
    </div>
  )
}

// Client component for accept/reject buttons
import PendingActions from '@/components/friends/PendingActions'
