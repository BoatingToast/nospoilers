'use client'

import type { ReactNode } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FriendsFeed from '@/components/friends/FriendsFeed'
import FriendRecs  from '@/components/friends/FriendRecs'

export default function FriendsFeedTab({ extras }: { extras?: ReactNode }) {
  return (
    <div className="space-y-12">
      <PageHeader title="Friends">
        <Button variant="secondary" href="/friends/find">
          + Find Friends
        </Button>
        <Button variant="outline" href="/friends">
          Full page →
        </Button>
      </PageHeader>
      <FriendRecs />
      <FriendsFeed />
      {extras}
    </div>
  )
}
