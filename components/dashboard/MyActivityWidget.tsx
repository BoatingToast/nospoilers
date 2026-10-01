'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Section from '@/components/ui/Section'
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
  const cls = 'text-ns-secondary-readable/60'
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
    <div className="flex min-h-12 items-center gap-3 py-3">
      {/* Poster thumbnail, or a plain icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded">
        {poster ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${poster}`}
            alt=""
            width={32} height={32}
            className="h-full w-full object-cover"
          />
        ) : (
          <ActivityIcon type={e.type} />
        )}
      </div>
      <p className="line-clamp-2 min-w-0 flex-1 font-body text-sm leading-snug text-ns-text">{text}</p>
      <p className="flex-shrink-0 font-body text-xs text-ns-muted">{timeAgo(e.createdAt)}</p>
    </div>
  )

  if (link) {
    return (
      <li className="border-t border-ns-border">
        <Link href={link} className="block transition-colors hover:bg-ns-surface">{inner}</Link>
      </li>
    )
  }
  return <li className="border-t border-ns-border">{inner}</li>
}

function Skeleton() {
  return (
    <ul>
      {[1, 2, 3].map(i => (
        <li key={i} className="flex animate-pulse items-center gap-3 border-t border-ns-border py-3">
          <div className="h-8 w-8 flex-shrink-0 rounded bg-ns-surface-2" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-3/4 rounded bg-ns-surface-2" />
            <div className="h-2 w-1/4 rounded bg-ns-surface-2" />
          </div>
        </li>
      ))}
    </ul>
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
    <Section title="My Activity">
      {loading ? (
        <Skeleton />
      ) : events.length === 0 ? (
        <div className="border-t border-ns-border pt-4">
          <p className="font-body text-sm text-ns-text">No recent activity</p>
          <p className="mt-1 font-body text-sm text-ns-muted">Rate a movie to get started</p>
        </div>
      ) : (
        <ul className="border-b border-ns-border">
          {events.map(e => <EventRow key={e.id} e={e} />)}
        </ul>
      )}
    </Section>
  )
}
