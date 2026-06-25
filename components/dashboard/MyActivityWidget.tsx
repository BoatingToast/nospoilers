'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  RatingsIcon, WatchlistIcon, TopFiveIcon,
  AchievementsIcon, FriendsIcon, SpoilerZoneIcon, MovieDnaIcon,
} from '@/components/icons'

interface ActivityEvent {
  id:        string
  type:      string
  data:      Record<string, unknown>
  createdAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ActivityIcon({ type }: { type: string }) {
  const cls = 'text-ns-gold/60'
  const size = 14
  switch (type) {
    case 'rated_movie':        return <RatingsIcon     size={size} className={cls} />
    case 'added_to_watchlist': return <WatchlistIcon   size={size} className={cls} />
    case 'watched_movie':      return <WatchlistIcon   size={size} className={cls} />
    case 'updated_top_five':
    case 'updated_top5':       return <TopFiveIcon     size={size} className={cls} />
    case 'earned_achievement': return <AchievementsIcon size={size} className={cls} />
    case 'followed_user':      return <FriendsIcon     size={size} className={cls} />
    case 'joined_spoiler_zone':
    case 'joined_sz':          return <SpoilerZoneIcon size={size} className={cls} />
    case 'dna_updated':        return <MovieDnaIcon    size={size} className={cls} />
    default:                   return <RatingsIcon     size={size} className={cls} />
  }
}

function activityCopy(e: ActivityEvent): { text: string; link?: string; poster?: string } {
  const d = e.data
  // movieTitle is the canonical field; fall back to title for legacy events
  const movie = (d.movieTitle ?? d.title ?? 'a movie') as string
  const movieLink = d.tmdbId ? `/movies/${d.tmdbId}` : undefined

  switch (e.type) {
    case 'rated_movie': {
      // score is stored as 0–100 integer; convert to /10 for display
      const scoreRaw = d.score
      const scoreLabel = typeof scoreRaw === 'number'
        ? ` — ${(scoreRaw / 10).toFixed(1)}/10`
        : ''
      return {
        text:   `Rated ${movie}${scoreLabel}`,
        link:   movieLink,
        poster: d.posterPath as string | undefined,
      }
    }
    case 'added_to_watchlist':
      return {
        text: `Added ${movie} to watchlist`,
        link: movieLink,
      }
    case 'watched_movie':
      return {
        text: `Finished watching ${movie}`,
        link: movieLink,
      }
    case 'updated_top_five':
    case 'updated_top5':
      return { text: 'Updated your Top 5 movies', link: '/top5' }
    case 'earned_achievement':
      return {
        text: `Earned the "${d.achievementName ?? 'Achievement'}" badge`,
        link: '/achievements',
      }
    case 'followed_user': {
      // targetUsername is stored by the follow API; followedUsername is a legacy key
      const who = (d.targetUsername ?? d.followedUsername) as string | undefined
      return {
        text: `Followed @${who ?? 'someone'}`,
        link: who ? `/profile/${who}` : undefined,
      }
    }
    case 'joined_spoiler_zone':
    case 'joined_sz':
      return {
        text: `Joined Spoiler Zone: ${movie}`,
        link: d.spoilerZoneId ? `/spoilerzones/${d.spoilerZoneId}` : movieLink,
      }
    case 'created_collection':
      return {
        text: `Created collection "${d.collectionTitle ?? d.name ?? 'untitled'}"`,
        link: d.collectionId ? `/collections/${d.collectionId}` : undefined,
      }
    case 'added_favorite':
      return {
        text: `Added ${movie} to favourites`,
        link: movieLink,
      }
    case 'personality_assigned':
      return {
        text: `Became "${d.personalityName ?? 'a new personality type'}"`,
        link: '/dashboard',
      }
    case 'dna_updated':
      return { text: 'Your Movie DNA evolved', link: '/dashboard' }
    case 'onboarding_completed':
      return { text: 'Joined NoSpoilers', link: '/dashboard' }
    default:
      return { text: 'Recent activity', link: undefined }
  }
}

function EventRow({ e }: { e: ActivityEvent }) {
  const { text, link, poster } = activityCopy(e)
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-ns-bg/30 transition-colors group">
      {/* Icon or poster */}
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-ns-bg/50 border border-ns-border/40 flex items-center justify-center flex-shrink-0">
        {poster ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${poster}`}
            alt=""
            width={32} height={32}
            className="object-cover w-full h-full"
          />
        ) : (
          <ActivityIcon type={e.type} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-body text-ns-text leading-snug line-clamp-2">{text}</p>
        <p className="text-[10px] font-body text-ns-muted/40 mt-0.5">{timeAgo(e.createdAt)}</p>
      </div>
    </div>
  )

  if (link) {
    return <Link href={link} className="block">{inner}</Link>
  }
  return <div>{inner}</div>
}

function Skeleton() {
  return (
    <div className="divide-y divide-ns-border/20">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-ns-border flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-ns-border rounded w-3/4" />
            <div className="h-2 bg-ns-border/50 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MyActivityWidget() {
  const [events,  setEvents]  = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity/mine?limit=8')
      .then(r => r.ok ? r.json() : { events: [] })
      .then((d: { events: ActivityEvent[] }) => {
        setEvents(d.events)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-ns-border/50">
        <span className="text-xs font-body font-semibold text-ns-text uppercase tracking-wide">
          My Activity
        </span>
      </div>

      {loading ? (
        <Skeleton />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <p className="text-ns-muted/50 text-xs font-body">No recent activity</p>
          <p className="text-ns-muted/30 text-[10px] font-body mt-1">Rate a movie to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-ns-border/20">
          {events.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
    </div>
  )
}
