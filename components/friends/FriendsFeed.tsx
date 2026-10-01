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
    <div className="border-b border-ns-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 border-t border-ns-border py-4">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-border" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-ns-border" />
            <div className="h-2 w-1/3 rounded bg-ns-border" />
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
      <div className="border-t border-ns-border py-6">
        <p className="font-body text-base font-semibold text-ns-text">Your friends feed is empty</p>
        <p className="mt-1 font-body text-sm text-ns-muted">
          Add friends to see what they&apos;re watching and rating.
        </p>
        <Button variant="secondary" href="/friends/find" className="mt-5 w-full sm:w-auto">
          Find Friends <ArrowRightIcon size={13} />
        </Button>
      </div>
    )
  }

  return (
    <div className="border-b border-ns-border">
      {feed.map(event => (
        <div key={event.id} className="flex min-w-0 items-start gap-3 border-t border-ns-border py-4">
          <Avatar
            src={event.authorAvatarUrl}
            username={event.authorUsername}
            size="sm"
            href
          />

          <div className="min-w-0 flex-1">
            <p className="font-body text-sm leading-snug text-ns-text [overflow-wrap:anywhere]">
              <Link href={`/profile/${event.authorUsername}`} className="font-medium text-ns-secondary-readable underline-offset-4 transition-colors hover:text-ns-text hover:underline">
                @{event.authorUsername}
              </Link>
              {' '}
              <span className="text-ns-muted">{eventLabel(event)}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              {(() => { const Ico = EVENT_ICONS[event.type] ?? FilmIcon; return <Ico size={12} className="flex-shrink-0 text-ns-muted" /> })()}
              <span className="font-body text-[11px] text-ns-muted">{timeAgo(event.createdAt)}</span>
            </div>
          </div>

          {/* Link to movie if applicable */}
          {event.type === 'rated_movie' && typeof event.data.tmdbId === 'number' && (
            <Link
              href={`/movie/${event.data.tmdbId}`}
              className="flex min-h-[40px] flex-shrink-0 items-center gap-1 font-heading text-xs text-ns-muted underline-offset-4 transition-colors hover:text-ns-text hover:underline"
            >
              View <ArrowRightIcon size={9} />
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
