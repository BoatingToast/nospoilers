'use client'

import Link from 'next/link'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs  from '@/components/friends/FriendRecs'

export default function FriendsFeedTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-heading text-white">Friends</h2>
        <div className="flex items-center gap-3">
          <Link href="/friends/find" className="text-xs font-body text-ns-muted hover:text-ns-gold transition-colors">
            + Find Friends
          </Link>
          <Link href="/friends" className="text-xs font-body text-ns-muted hover:text-ns-gold transition-colors">
            Full page →
          </Link>
        </div>
      </div>
      <FriendRecs />
      <FriendsFeed />
    </div>
  )
}
