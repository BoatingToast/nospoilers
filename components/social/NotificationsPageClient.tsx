'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { SettingsIcon } from '@/components/icons'
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

  const filterIndex = filter === 'all' ? 0 : 1

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader
        title="Notifications"
        description={
          <span key={unreadCount} className="inline-block animate-fade-up">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'You’re all caught up'}
          </span>
        }
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant="secondary" onClick={() => void markAllRead()}>
                Mark all read
              </Button>
            )}
            <Link
              href="/settings/notifications"
              aria-label="Notification settings"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ns-surface text-ns-text transition-colors hover:bg-ns-surface-2"
            >
              <SettingsIcon size={18} />
            </Link>
          </>
        }
      />

      <div className="relative mt-8 grid max-w-xs grid-cols-2 rounded-full bg-ns-surface p-1">
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-ns-text transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${filterIndex * 100}%)` }}
        />
        {(['all', 'unread'] as const).map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`relative min-h-11 rounded-full px-3 text-sm font-semibold capitalize tabular-nums transition-colors duration-150
              ${filter === value ? 'text-ns-bg' : 'text-ns-muted hover:text-ns-text'}`}
          >
            {value}{value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
            {[1, 2, 3, 4, 5].map(index => (
              <div key={index} className="flex animate-pulse items-start gap-4 px-5 py-4 sm:px-6">
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-ns-surface-2" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-1/3 rounded-sm bg-ns-surface-2" />
                  <div className="h-3.5 w-3/4 rounded-sm bg-ns-surface-2" />
                  <div className="h-3 w-1/5 rounded-sm bg-ns-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title="Notifications couldn’t be loaded."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true)
                  void loadNotifications()
                }}
              >
                Try again
              </Button>
            }
          />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            key={filter}
            className="animate-fade-up"
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description={filter === 'unread'
              ? 'You’re all caught up.'
              : 'New followers and other activity will appear here.'}
          />
        ) : (
          <div key={filter} className="animate-fade-up space-y-8">
            {(['today', 'yesterday', 'earlier'] as const).filter(group => groups[group].length > 0).map((group, index) => (
              (
                <section
                  key={group}
                  className={index > 0 ? 'ns-reveal' : undefined}
                  style={{ '--i': index } as React.CSSProperties}
                >
                  <h2 className="mb-3 font-heading text-xl font-bold text-ns-text">
                    {labels[group]}
                  </h2>
                  <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
                    {groups[group].map(notification => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onSelect={markOneRead}
                        roomy
                      />
                    ))}
                  </div>
                </section>
              )
            ))}
          </div>
        )}
      </div>

      {notifications.length >= 50 && (
        <p className="mt-6 text-center text-sm text-ns-muted">
          Showing your 50 most recent notifications.
        </p>
      )}
    </div>
  )
}
