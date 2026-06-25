import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FindFriends from '@/components/friends/FindFriends'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Find Friends — NoSpoilers' }

export default async function FindFriendsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/friends"
        className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-6"
      >
        ← Back to Friends
      </Link>

      <div className="mb-8">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">Social</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text">Find Friends</h1>
        <p className="text-ns-muted text-sm font-body mt-2">
          Search by username, or discover people with similar movie taste.
        </p>
      </div>

      <FindFriends />
    </div>
  )
}
