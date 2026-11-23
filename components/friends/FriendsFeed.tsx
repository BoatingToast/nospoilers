'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { FriendFeedItem } from '@/types'
import {
  RatingsIcon, WatchlistIcon, CollectionsIcon, AchievementsIcon,
  HeartIcon, WrappedIcon, FilmIcon, FriendsIcon, ArrowRightIcon,
  type IconProps,
} from '@/components/icons'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

const EVENT_ICONS: Record<string, React.ComponentType<IconProps>> = {
  rated_movie:              RatingsIcon,
  added_to_watchlist:       WatchlistIcon,
  created_collection:       CollectionsIcon,
  earned_achievement:       AchievementsIcon,
  added_favorite:           HeartIcon,
  personality_assigned:     WrappedIcon,
  onboarding_completed:     FilmIcon,
  accepted_friend_request:  FriendsIcon,
}

function eventLabel(event: FriendFeedItem): string {
  const d = event.data
  const u = event.authorUsername
  switch (event.type) {
    case 'rated_movie':
      return `rated ${d.movieTitle ?? 'a film'} — ${d.score ?? ''}`
    case 'added_to_watchlist':
      return `added ${d.movieTitle ?? 'a film'} to their watchlist`
    case 'created_collection':
      return `created a collection: "${d.collectionTitle ?? 'Untitled'}"`
    case 'earned_achievement':
      return `earned the "${d.achievementName ?? 'Achievement'}" badge`
    case 'added_favorite':
      return `added ${d.movieTitle ?? 'a film'} to favorites`
    case 'personality_assigned':
      return `became "${d.personalityName ?? 'a Personality Type'}"`
    case 'onboarding_completed':
      return `joined NoSpoilers`
    case 'accepted_friend_request':
      return `became friends with @${d.targetUsername ?? 'someone'}`
    default:
      return `did something cinematic`
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function Skeleton() {
  return (
    <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 p-4">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded-sm bg-ns-surface-2" />
            <div className="h-3 w-1/3 rounded-sm bg-ns-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FriendsFeed() {
  const [feed,    setFeed]    = useState<FriendFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/friends/feed')
      .then(r => r.json())
      .then(data => setFeed(data.feed ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  if (feed.length === 0) {
    return (
      <EmptyState
        title="Your friends feed is empty"
        description="Add friends to see what they're watching and rating."
        action={
          <Button variant="outline" href="/friends/find">
            Find friends <ArrowRightIcon size={14} />
          </Button>
        }
      />
    )
  }

  return (
    <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
      {feed.map((event, index) => {
        const EventIcon = EVENT_ICONS[event.type] ?? FilmIcon
        return (
          <div
            key={event.id}
            className="ns-reveal flex items-start gap-3 p-4"
            style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
          >
            <Avatar src={event.authorAvatarUrl} username={event.authorUsername} size="sm" href />

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm leading-snug text-ns-muted">
                <Link
                  href={`/profile/${event.authorUsername}`}
                  className="font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable"
                >
                  @{event.authorUsername}
                </Link>
                {' '}
                {eventLabel(event)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ns-subtle">
                <EventIcon size={12} className="flex-shrink-0" />
                {timeAgo(event.createdAt)}
              </p>
            </div>

            {/* Link to movie if applicable */}
            {event.type === 'rated_movie' && typeof event.data.tmdbId === 'number' && (
              <Link
                href={`/movie/${event.data.tmdbId}`}
                className="-my-1 flex min-h-11 flex-shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-2 sm:min-h-10"
              >
                View <ArrowRightIcon size={12} />
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
