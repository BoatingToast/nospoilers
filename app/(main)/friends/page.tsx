import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFriends, getPendingRequests } from '@/services/friends'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs from '@/components/friends/FriendRecs'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Friends — NoSpoilers' }

export default async function FriendsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [friends, pending] = await Promise.all([
    getFriends(session.user.id),
    getPendingRequests(session.user.id),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading text-white mb-1">Friends</h1>
          <p className="text-ns-muted text-sm font-body">
            {friends.length} friend{friends.length !== 1 ? 's' : ''} · Discover movies through people you trust
          </p>
        </div>
        <Link
          href="/friends/find"
          className="px-5 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-amber-400 transition-colors flex-shrink-0"
        >
          + Find Friends
        </Link>
      </div>

      {/* Pending requests */}
      {pending.received.length > 0 && (
        <div className="mb-8 bg-ns-surface border border-ns-gold/20 rounded-2xl p-5">
          <p className="text-ns-gold text-xs tracking-widest uppercase font-body mb-4">
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
      {friends.length > 0 && (
        <div className="mb-8">
          <FriendRecs />
        </div>
      )}

      {/* Friends list */}
      {friends.length > 0 && (
        <div className="mb-8">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Your Friends</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map(f => (
              <FriendCard key={f.id} friend={f} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Friend Activity</p>
        <FriendsFeed />
      </div>
    </div>
  )
}

// ─── Sub-components (server-side) ─────────────────────────────────────────────

function FriendCard({ friend }: { friend: { id: string; username: string; avatarUrl: string | null; personality: string | null } }) {
  const PERSONALITY_LABELS: Record<string, string> = {
    'thinker':        'The Thinker',
    'thriller-seeker':'Thriller Seeker',
    'explorer':       'The Explorer',
    'story-analyst':  'Story Analyst',
    'entertainer':    'The Entertainer',
    'auteur':         'The Auteur',
    'escapist':       'The Escapist',
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-ns-surface border border-ns-border rounded-2xl hover:border-ns-border/80 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar src={friend.avatarUrl} username={friend.username} size="md" href />
        <div>
          <Link href={`/profile/${friend.username}`} className="text-sm font-body text-white hover:text-ns-gold transition-colors font-medium">
            @{friend.username}
          </Link>
          {friend.personality && (
            <p className="text-[10px] font-body text-ns-muted mt-0.5">
              {PERSONALITY_LABELS[friend.personality] ?? friend.personality}
            </p>
          )}
        </div>
      </div>
      <Link
        href={`/compatibility/${friend.username}`}
        className="text-[10px] font-body text-ns-gold hover:text-amber-400 transition-colors"
      >
        Compare
      </Link>
    </div>
  )
}

function PendingRequestRow({ req }: { req: { requestId: string; username: string; sentAt: string } }) {
  // This is a server component — buttons need to be client-side
  // We'll render this as a link to avoid making the whole page client
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/profile/${req.username}`} className="flex items-center gap-2">
        <Avatar src={null} username={req.username} size="sm" />
        <span className="text-sm font-body text-white">@{req.username}</span>
      </Link>
      <PendingActions requestId={req.requestId} username={req.username} />
    </div>
  )
}

// Client component for accept/reject buttons
import PendingActions from '@/components/friends/PendingActions'
