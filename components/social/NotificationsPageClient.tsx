'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SettingsIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import type { NotificationItem } from '@/services/notifications'
import {
  NotificationRow,
  notificationDayGroup,
  type NotificationDayGroup,
} from '@/components/social/NotificationItemView'

interface NotificationResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

type Filter = 'all' | 'unread'

export default function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=50', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load notifications')
      const data = await response.json() as NotificationResponse
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const markOneRead = useCallback((notification: NotificationItem) => {
    if (notification.read) return

    setNotifications(current => current.map(item => (
      item.id === notification.id ? { ...item, read: true } : item
    )))
    setUnreadCount(current => Math.max(0, current - 1))
    void fetch(`/api/notifications?id=${encodeURIComponent(notification.id)}`, {
      method: 'PATCH',
      keepalive: true,
    }).catch(() => {})
  }, [])

  const markAllRead = useCallback(async () => {
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
    setUnreadCount(0)

    try {
      const response = await fetch('/api/notifications', { method: 'PATCH' })
      if (!response.ok) throw new Error('Failed to mark notifications as read')
    } catch {
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
    }
  }, [notifications, unreadCount])

  const visibleNotifications = useMemo(
    () => filter === 'unread'
      ? notifications.filter(notification => !notification.read)
      : notifications,
    [filter, notifications],
  )

  const groups = useMemo(() => {
    const result: Record<NotificationDayGroup, NotificationItem[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    }
    for (const notification of visibleNotifications) {
      result[notificationDayGroup(notification.createdAt)].push(notification)
    }
    return result
  }, [visibleNotifications])

  const labels: Record<NotificationDayGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Notifications"
        lede={unreadCount > 0
          ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
          : 'You’re all caught up'}
        className="mb-6"
      >
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        )}
        <Link
          href="/settings/notifications"
          aria-label="Notification settings"
          className="inline-flex min-h-[40px] items-center gap-2 font-heading text-sm text-ns-muted underline-offset-4 transition-colors hover:text-ns-text hover:underline"
        >
          <SettingsIcon size={16} />
          Settings
        </Link>
      </PageHeader>

      <div className="mb-8 flex gap-x-6 border-b border-ns-border">
        {(['all', 'unread'] as const).map(value => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`-mb-px min-h-[44px] border-b-2 font-heading text-sm font-semibold capitalize transition-colors
              ${filter === value
                ? 'border-ns-text text-ns-text'
                : 'border-transparent text-ns-muted hover:text-ns-text'
              }`}
          >
            {value}{value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="min-w-0 space-y-10">
        {loading ? (
          <div className="border-b border-ns-border">
            {[1, 2, 3, 4, 5].map(index => (
              <div key={index} className="flex animate-pulse items-start gap-3 border-t border-ns-border px-3 py-4">
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-border/60" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 w-1/3 rounded bg-ns-border/60" />
                  <div className="h-3 w-3/4 rounded bg-ns-border/40" />
                  <div className="h-2 w-1/5 rounded bg-ns-border/30" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="border-t border-ns-border py-8">
            <p className="font-body text-sm text-ns-muted">Notifications couldn’t be loaded.</p>
            <button
              onClick={() => {
                setLoading(true)
                void loadNotifications()
              }}
              className="mt-2 min-h-[40px] font-heading text-sm font-semibold text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
            >
              Try again
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="border-t border-ns-border py-8">
            <p className="font-body text-base font-semibold text-ns-text">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="mt-1 font-body text-sm text-ns-muted">
              {filter === 'unread'
                ? 'You’re all caught up.'
                : 'New followers and other activity will appear here.'}
            </p>
          </div>
        ) : (
          (['today', 'yesterday', 'earlier'] as const).map(group => (
            groups[group].length > 0 && (
              <Section key={group} title={labels[group]}>
                <div className="border-b border-ns-border">
                  {groups[group].map(notification => (
                    <div key={notification.id} className="border-t border-ns-border">
                      <NotificationRow
                        notification={notification}
                        onSelect={markOneRead}
                        roomy
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )
          ))
        )}
      </div>

      {notifications.length >= 50 && (
        <p className="mt-6 font-body text-xs text-ns-muted">
          Showing your 50 most recent notifications.
        </p>
      )}
    </div>
  )
}
