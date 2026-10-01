'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import {
  FriendsIcon,
  PersonIcon,
  CollectionsIcon,
  ReviewsIcon,
  AchievementsIcon,
  MovieDnaIcon,
  RecsIcon,
  SpoilerZoneIcon,
  NotificationsIcon,
} from '@/components/icons'
import type { NotificationItem } from '@/services/notifications'

export function NotificationTypeIcon({
  icon,
  unread,
  size = 16,
}: {
  icon: string
  unread: boolean
  size?: number
}) {
  const className = `flex-shrink-0 ${unread ? 'text-ns-secondary-readable' : 'text-ns-muted/50'}`

  switch (icon) {
    case 'person':       return <PersonIcon size={size} className={className} />
    case 'friends':      return <FriendsIcon size={size} className={className} />
    case 'collections':  return <CollectionsIcon size={size} className={className} />
    case 'reviews':      return <ReviewsIcon size={size} className={className} />
    case 'achievements': return <AchievementsIcon size={size} className={className} />
    case 'dna':          return <MovieDnaIcon size={size} className={className} />
    case 'recs':         return <RecsIcon size={size} className={className} />
    case 'spoilerzone':  return <SpoilerZoneIcon size={size} className={className} />
    default:             return <NotificationsIcon size={size} className={className} />
  }
}

export function notificationTimeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export type NotificationDayGroup = 'today' | 'yesterday' | 'earlier'

export function notificationDayGroup(iso: string): NotificationDayGroup {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date >= today) return 'today'
  if (date >= yesterday) return 'yesterday'
  return 'earlier'
}

export function NotificationRow({
  notification,
  onSelect,
  roomy = false,
}: {
  notification: NotificationItem
  onSelect: (notification: NotificationItem) => void
  roomy?: boolean
}) {
  return (
    <Link
      href={notification.link}
      onClick={() => onSelect(notification)}
      className={`group relative flex items-start gap-3 transition-colors
        ${roomy ? 'px-5 py-4 sm:px-6' : 'px-4 py-3.5'}
        ${notification.read
          ? 'hover:bg-ns-bg/30'
          : 'border-l-2 border-ns-secondary/40 bg-ns-secondary/[0.04] hover:bg-ns-secondary/[0.07]'
        }`}
    >
      {notification.actorUsername ? (
        <div className="mt-0.5">
          <Avatar
            src={notification.actorAvatarUrl}
            username={notification.actorUsername}
            size={roomy ? 'md' : 'sm'}
          />
        </div>
      ) : (
        <div className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-xl
          ${roomy ? 'h-10 w-10' : 'h-8 w-8 rounded-lg'}
          ${notification.read ? 'bg-ns-bg/50' : 'bg-ns-secondary/10'}`}
        >
          <NotificationTypeIcon
            icon={notification.icon}
            unread={!notification.read}
            size={roomy ? 18 : 16}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className={`${roomy ? 'text-sm' : 'text-xs'} font-body font-semibold leading-tight
          ${notification.read ? 'text-ns-muted' : 'text-ns-text'}`}
        >
          {notification.title}
        </p>
        <p className={`${roomy ? 'mt-1 text-sm' : 'mt-0.5 line-clamp-2 text-xs'} font-body leading-snug
          ${notification.read ? 'text-ns-muted/50' : 'text-ns-muted/80'}`}
        >
          {notification.body}
        </p>
        <p className={`${roomy ? 'mt-1.5' : 'mt-1'} text-[10px] font-body text-ns-muted/40`}>
          {notificationTimeAgo(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-ns-secondary shadow-sm shadow-ns-secondary/50" />
      )}
    </Link>
  )
}
