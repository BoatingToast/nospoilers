'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { FriendFeedItem } from '@/services/friends-feed'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

// ── Icons ─────────────────────────────────────────────────────────────────────

function HeartIcon({ filled = false, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill={filled ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// ── Activity copy ─────────────────────────────────────────────────────────────

type FeedItem = FriendFeedItem

function activityLabel(item: FeedItem): { text: string; href: string } {
  const d = item.data as Record<string, unknown>
  // movieTitle is stored as `movieTitle`; some older events may use `title`
  const movie  = (d.movieTitle ?? d.title ?? 'a movie') as string
  const movieHref = d.tmdbId ? `/movies/${d.tmdbId}` : `/profile/${item.authorUsername}`

  switch (item.type) {
    case 'rated_movie':
      return {
        text: `rated "${movie}" — ${d.score ?? '?'}/100`,
        href: movieHref,
      }
    case 'added_to_watchlist':
      return {
        text: `added "${movie}" to their watchlist`,
        href: movieHref,
      }
    case 'watched_movie':
      return {
        text: `finished watching "${movie}"`,
        href: movieHref,
      }
    case 'created_collection':
      return {
        text: `created a collection — "${d.collectionTitle ?? d.name ?? 'untitled'}"`,
        href: d.collectionId ? `/collections/${d.collectionId}` : `/profile/${item.authorUsername}`,
      }
    case 'earned_achievement':
      return {
        text: `earned the "${d.achievementName ?? d.name ?? 'an'}" achievement`,
        href: `/profile/${item.authorUsername}`,
      }
    case 'added_favorite':
      return {
        text: `added "${movie}" to their favourites`,
        href: movieHref,
      }
    case 'joined_spoiler_zone':
      return {
        text: `joined the ${movie} Spoiler Zone`,
        href: movieHref,
      }
    case 'updated_top_five':
    case 'updated_top5':
      return {
        text: `updated their Top 5 Films`,
        href: `/profile/${item.authorUsername}`,
      }
    case 'followed_user':
      return {
        text: `followed @${d.targetUsername ?? d.followedUsername ?? 'someone'}`,
        href: d.targetUsername ? `/profile/${d.targetUsername}` : `/profile/${item.authorUsername}`,
      }
    case 'personality_assigned':
      return {
        text: `became "${d.personalityName ?? 'a new personality type'}"`,
        href: `/profile/${item.authorUsername}`,
      }
    default:
      return { text: 'was active', href: `/profile/${item.authorUsername}` }
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Like button (local optimistic) ───────────────────────────────────────────

function LikeBtn({ eventId, initialLiked, initialCount }: {
  eventId:      string
  initialLiked: boolean
  initialCount: number
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  const toggle = async () => {
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    const res  = await fetch('/api/activity/like', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ activityEventId: eventId }),
    })
    if (!res.ok) {
      setLiked(!next)
      setCount(c => c + (next ? -1 : 1))
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 text-xs font-body transition-colors
        ${liked ? 'text-red-400' : 'text-ns-muted hover:text-red-400'}`}
    >
      <HeartIcon filled={liked} size={12} />
      {count > 0 && count}
    </button>
  )
}

// ── Activity Row ──────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: FeedItem }) {
  const { text, href } = activityLabel(item)
  return (
    <li className="flex items-start gap-3 border-t border-ns-border py-3">
      <Avatar src={item.authorAvatarUrl} username={item.authorUsername} size="sm" href />
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm leading-snug text-ns-text">
          <Link href={`/profile/${item.authorUsername}`}
                className="font-semibold transition-colors hover:text-ns-secondary-readable">
            @{item.authorUsername}
          </Link>{' '}
          <Link href={href} className="text-ns-muted transition-colors hover:text-ns-text">
            {text}
          </Link>
        </p>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-body text-xs text-ns-muted">{timeAgo(item.createdAt)}</span>
          <LikeBtn eventId={item.id} initialLiked={item.userLiked} initialCount={item.likeCount} />
        </div>
      </div>
    </li>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function FriendsActivityWidget() {
  const [items,   setItems]   = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity/feed')
      .then(r => r.ok ? r.json() : { feed: [] })
      .then((d: { feed: FeedItem[] }) => setItems(d.feed.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Section title="Friends Activity" href="/feed" linkLabel="View All →">
      {loading ? (
        <ul>
          {[1, 2, 3, 4].map(i => (
            <li key={i} className="flex animate-pulse gap-3 border-t border-ns-border py-3">
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-ns-surface-2" />
                <div className="h-2 w-1/4 rounded bg-ns-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="border-t border-ns-border pt-4">
          <p className="font-body text-sm text-ns-muted">
            Follow people to see their activity here.
          </p>
          <Button variant="outline" size="sm" href="/friends/find" className="mt-4 min-h-10">
            Find People
          </Button>
        </div>
      ) : (
        <ul className="border-b border-ns-border">
          {items.map(item => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Section>
  )
}
