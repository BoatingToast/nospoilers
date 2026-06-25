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
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">
        Activity
      </p>
      <div className="flex flex-col gap-3">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-3">
            {(() => { const Ico = EVENT_ICONS[event.type] ?? FilmIcon; return <Ico size={14} className="text-ns-gold/70 flex-shrink-0 mt-0.5" /> })()}
            <div className="flex-1 min-w-0">
              <p className="text-ns-text text-xs font-body leading-snug">
                {formatActivityEvent(event, username)}
              </p>
              <p className="text-ns-muted/50 text-[10px] font-body mt-0.5">
                {timeAgo(event.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
