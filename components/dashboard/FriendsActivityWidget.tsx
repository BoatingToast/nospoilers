'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { FriendFeedItem } from '@/services/friends-feed'

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
      className={`flex items-center gap-1 text-[10px] font-body transition-colors
        ${liked ? 'text-red-400' : 'text-ns-muted/50 hover:text-red-400'}`}
    >
      <HeartIcon filled={liked} size={11} />
      {count > 0 && count}
    </button>
  )
}

// ── Activity Row ──────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: FeedItem }) {
  const { text, href } = activityLabel(item)
  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-ns-bg/30 transition-colors group">
      {/* Avatar */}
      <Link href={`/profile/${item.authorUsername}`} className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-ns-border overflow-hidden flex items-center justify-center text-xs font-body text-ns-muted">
          {item.authorAvatarUrl
            ? <img src={item.authorAvatarUrl} alt="" className="w-full h-full object-cover" />
            : item.authorUsername.charAt(0).toUpperCase()
          }
        </div>
      </Link>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-body text-ns-text leading-snug">
          <Link href={`/profile/${item.authorUsername}`}
                className="font-semibold hover:text-ns-gold transition-colors">
            @{item.authorUsername}
          </Link>{' '}
          <Link href={href} className="text-ns-muted/80 hover:text-ns-text transition-colors">
            {text}
          </Link>
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-body text-ns-muted/40">{timeAgo(item.createdAt)}</span>
          <LikeBtn eventId={item.id} initialLiked={item.userLiked} initialCount={item.likeCount} />
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
    <section>
      <div className="flex items-center justify-between mb-4 px-0">
        <div>
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Social</p>
          <h2 className="font-display text-2xl tracking-wider text-ns-text mt-0.5">Friends Activity</h2>
        </div>
        <Link
          href="/feed"
          className="text-xs font-body text-ns-gold hover:text-amber-400 transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-ns-border/30">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 p-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-ns-border flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-ns-border rounded w-3/4" />
                  <div className="h-2 bg-ns-border rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center px-6">
            <p className="text-ns-muted/50 text-sm font-body">
              Follow people to see their activity here.
            </p>
            <Link
              href="/friends/find"
              className="mt-3 inline-block px-4 py-2 rounded-xl text-xs font-body
                         bg-ns-gold/10 text-ns-gold border border-ns-gold/30
                         hover:bg-ns-gold hover:text-black transition-all"
            >
              Find People
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-ns-border/30">
            {items.map(item => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
