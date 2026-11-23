'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { FriendFeedItem } from '@/services/friends-feed'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { HeartIcon } from '@/components/icons'
import SectionHeading, { SectionLink } from './SectionHeading'

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
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={`Like${count > 0 ? `, ${count} ${count === 1 ? 'like' : 'likes'}` : ''}`}
      className={`-ml-2 inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm tabular-nums transition-colors duration-150 hover:bg-ns-surface-2 ${
        liked ? 'text-ns-danger' : 'text-ns-muted hover:text-ns-text'
      }`}
    >
      <HeartIcon key={String(liked)} size={15} className={`motion-safe:animate-fade-up ${liked ? 'fill-current' : ''}`} />
      {count > 0 && count}
    </button>
  )
}

// ── Activity Row ──────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: FeedItem }) {
  const { text, href } = activityLabel(item)
  return (
    <div className="flex items-start gap-3 py-3">
      <Avatar src={item.authorAvatarUrl} username={item.authorUsername} size="sm" href />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-ns-text [overflow-wrap:anywhere]">
          <Link href={`/profile/${item.authorUsername}`} className="font-semibold transition-colors hover:text-ns-secondary-readable">
            @{item.authorUsername}
          </Link>{' '}
          <Link href={href} className="text-ns-muted transition-colors hover:text-ns-text">
            {text}
          </Link>
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <LikeBtn eventId={item.id} initialLiked={item.userLiked} initialCount={item.likeCount} />
          <span className="text-xs tabular-nums text-ns-muted">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
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
    <section aria-labelledby="friends-activity-title">
      <SectionHeading
        id="friends-activity-title"
        title="Friends Activity"
        action={<SectionLink href="/feed">View All</SectionLink>}
      />

      <div className="rounded-2xl bg-ns-surface px-6 py-3">
        {loading ? (
          <div aria-hidden="true" className="divide-y divide-ns-border">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex animate-pulse gap-3 py-3">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-ns-surface-2" />
                  <div className="h-3 w-1/4 rounded bg-ns-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-5">
            <p className="text-base text-ns-muted">Follow people to see their activity here.</p>
            <Button variant="secondary" href="/friends/find" className="bg-ns-surface-2 hover:bg-ns-surface-3">Find People</Button>
          </div>
        ) : (
          <div className="divide-y divide-ns-border motion-safe:animate-fade-up">
            {items.map(item => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
