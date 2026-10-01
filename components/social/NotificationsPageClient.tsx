'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { NotificationsIcon, SettingsIcon } from '@/components/icons'
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
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ns-secondary/20 bg-ns-secondary/10">
            <NotificationsIcon size={20} className="text-ns-secondary-readable" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-ns-text">Notifications</h1>
            <p className="mt-0.5 text-xs font-body text-ns-muted/60">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'You’re all caught up'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="rounded-xl border border-ns-secondary/25 bg-ns-secondary/10 px-3 py-2 text-xs font-body font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-secondary/15"
            >
              Mark all read
            </button>
          )}
          <Link
            href="/settings/notifications"
            aria-label="Notification settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ns-border bg-ns-surface text-ns-muted transition-colors hover:border-ns-secondary/30 hover:text-ns-secondary-readable"
          >
            <SettingsIcon size={16} />
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-ns-border/70 bg-ns-surface p-1">
        {(['all', 'unread'] as const).map(value => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-body font-semibold capitalize transition-colors
              ${filter === value
                ? 'bg-ns-secondary/15 text-ns-secondary-readable'
                : 'text-ns-muted/60 hover:bg-white/[0.03] hover:text-ns-text'
              }`}
          >
            {value}{value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-ns-border bg-ns-surface">
        {loading ? (
          <div className="divide-y divide-ns-border/30">
            {[1, 2, 3, 4, 5].map(index => (
              <div key={index} className="flex animate-pulse items-start gap-3 px-5 py-4 sm:px-6">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-ns-border/60" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 w-1/3 rounded bg-ns-border/60" />
                  <div className="h-3 w-3/4 rounded bg-ns-border/40" />
                  <div className="h-2 w-1/5 rounded bg-ns-border/30" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-body text-ns-muted">Notifications couldn’t be loaded.</p>
            <button
              onClick={() => {
                setLoading(true)
                void loadNotifications()
              }}
              className="mt-3 text-xs font-body font-semibold text-ns-secondary-readable hover:underline"
            >
              Try again
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ns-border/40">
              <NotificationsIcon size={24} className="text-ns-muted/30" />
            </div>
            <p className="text-sm font-body font-semibold text-ns-text">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="mt-1 text-xs font-body text-ns-muted/50">
              {filter === 'unread'
                ? 'You’re all caught up.'
                : 'New followers and other activity will appear here.'}
            </p>
          </div>
        ) : (
          (['today', 'yesterday', 'earlier'] as const).map(group => (
            groups[group].length > 0 && (
              <section key={group}>
                <div className="border-y border-ns-border/30 bg-ns-bg/35 px-5 py-2.5 first:border-t-0 sm:px-6">
                  <h2 className="text-[10px] font-body font-semibold uppercase tracking-widest text-ns-muted/50">
                    {labels[group]}
                  </h2>
                </div>
                <div className="divide-y divide-ns-border/25">
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
          ))
        )}
      </div>

      {notifications.length >= 50 && (
        <p className="mt-4 text-center text-xs font-body text-ns-muted/40">
          Showing your 50 most recent notifications.
        </p>
      )}
    </div>
  )
}
