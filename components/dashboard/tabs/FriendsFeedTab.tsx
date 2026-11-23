'use client'

import type { ReactNode } from 'react'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs  from '@/components/friends/FriendRecs'
import SectionHeading, { SectionLink } from '../SectionHeading'

export default function FriendsFeedTab({ extras }: { extras?: ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Friends"
        action={(
          <>
            <SectionLink href="/friends/find">Find Friends</SectionLink>
            <SectionLink href="/friends">Full page</SectionLink>
          </>
        )}
      />
      <FriendRecs />
      <FriendsFeed />
      {extras && (
        <div className="space-y-10 border-t border-ns-border pt-10">
          {extras}
        </div>
      )}
    </div>
  )
}
