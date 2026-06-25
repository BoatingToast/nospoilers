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
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 bg-ns-surface border border-ns-border rounded-2xl animate-pulse">
          <div className="w-8 h-8 bg-ns-border rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-ns-border rounded w-3/4" />
            <div className="h-2 bg-ns-border rounded w-1/3" />
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
      <div className="py-16 text-center">
        <FriendsIcon size={44} className="text-ns-gold/40 mx-auto mb-4" />
        <p className="text-white font-body mb-2">Your friends feed is empty</p>
        <p className="text-ns-muted text-sm font-body mb-6">
          Add friends to see what they&apos;re watching and rating.
        </p>
        <Link
          href="/friends/find"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-amber-400 transition-colors"
        >
          Find Friends <ArrowRightIcon size={13} />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {feed.map(event => (
        <div key={event.id} className="flex items-start gap-3 p-4 bg-ns-surface border border-ns-border rounded-2xl hover:border-ns-border/80 transition-colors">
          <Avatar
            src={event.authorAvatarUrl}
            username={event.authorUsername}
            size="sm"
            href
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-body text-white leading-snug">
              <Link href={`/profile/${event.authorUsername}`} className="text-ns-gold hover:text-amber-400 transition-colors font-medium">
                @{event.authorUsername}
              </Link>
              {' '}
              <span className="text-ns-muted">{eventLabel(event)}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              {(() => { const Ico = EVENT_ICONS[event.type] ?? FilmIcon; return <Ico size={12} className="text-ns-gold/60 flex-shrink-0" /> })()}
              <span className="text-[10px] font-body text-ns-muted/60">{timeAgo(event.createdAt)}</span>
            </div>
          </div>

          {/* Link to movie if applicable */}
          {event.type === 'rated_movie' && typeof event.data.tmdbId === 'number' && (
            <Link
              href={`/movie/${event.data.tmdbId}`}
              className="text-[10px] font-body text-ns-muted hover:text-ns-gold transition-colors flex-shrink-0 flex items-center gap-0.5"
            >
              View <ArrowRightIcon size={9} />
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
