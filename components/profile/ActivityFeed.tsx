import { formatActivityEvent } from '@/services/activity'
import type { ActivityEventItem } from '@/types'
import {
  HeartIcon, MovieDnaIcon, WrappedIcon, FriendsIcon, FilmIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  events:   ActivityEventItem[]
  username: string
}

const EVENT_ICONS: Record<string, React.ComponentType<IconProps>> = {
  added_favorite:        HeartIcon,
  dna_updated:           MovieDnaIcon,
  personality_assigned:  WrappedIcon,
  followed_user:         FriendsIcon,
  onboarding_completed:  FilmIcon,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

export default function ActivityFeed({ events, username }: Props) {
  return (
    <section className="rounded-2xl bg-ns-surface p-6">
      <h2 className="font-heading text-xl font-bold text-ns-text">Activity</h2>
      <div className="mt-4 divide-y divide-ns-border">
        {events.map(event => {
          const EventIcon = EVENT_ICONS[event.type] ?? FilmIcon
          return (
            <div key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <EventIcon size={16} className="mt-0.5 flex-shrink-0 text-ns-muted" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm leading-snug text-ns-text">
                  {formatActivityEvent(event, username)}
                </p>
                <p className="mt-0.5 text-xs text-ns-subtle">{timeAgo(event.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
