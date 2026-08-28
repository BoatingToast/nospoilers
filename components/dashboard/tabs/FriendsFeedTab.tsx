'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs  from '@/components/friends/FriendRecs'

export default function FriendsFeedTab({ extras }: { extras?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-heading text-white">Friends</h2>
        <div className="flex items-center gap-3">
          <Link href="/friends/find" className="text-xs font-body text-ns-muted hover:text-ns-secondary-readable transition-colors">
            + Find Friends
          </Link>
          <Link href="/friends" className="text-xs font-body text-ns-muted hover:text-ns-secondary-readable transition-colors">
            Full page →
          </Link>
        </div>
      </div>
      <FriendRecs />
      <FriendsFeed />
      {extras && (
        <div className="space-y-8 border-t border-ns-border/40 pt-8">
          {extras}
        </div>
      )}
    </div>
  )
}
