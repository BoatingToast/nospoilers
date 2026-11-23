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
  const className = `flex-shrink-0 ${unread ? 'text-ns-secondary-readable' : 'text-ns-muted'}`

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
      className={`group flex items-start gap-3 transition-colors duration-150 hover:bg-ns-surface-2
        ${roomy ? 'gap-4 px-5 py-4 sm:px-6' : 'px-4 py-3'}`}
    >
      {notification.actorUsername ? (
        <Avatar
          src={notification.actorAvatarUrl}
          username={notification.actorUsername}
          size={roomy ? 'md' : 'sm'}
        />
      ) : (
        <span
          className={`flex flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-2 transition-colors group-hover:bg-ns-surface-3
            ${roomy ? 'h-12 w-12' : 'h-8 w-8'}`}
        >
          <NotificationTypeIcon
            icon={notification.icon}
            unread={!notification.read}
            size={roomy ? 20 : 16}
          />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={`${roomy ? 'text-base' : 'text-sm'} font-semibold leading-snug break-words
          ${notification.read ? 'text-ns-muted' : 'text-ns-text'}`}
        >
          {notification.title}
        </p>
        <p className={`mt-0.5 text-sm leading-snug text-ns-muted break-words ${roomy ? '' : 'line-clamp-2'}`}>
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-ns-subtle">
          {notificationTimeAgo(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <span className="mt-2 flex-shrink-0">
          <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-ns-accent" />
          <span className="sr-only">Unread</span>
        </span>
      )}
    </Link>
  )
}
