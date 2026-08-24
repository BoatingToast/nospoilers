'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NotificationsIcon } from '@/components/icons'
import type { NotificationItem } from '@/services/notifications'
import {
  NotificationRow,
  NotificationTypeIcon,
  notificationDayGroup,
  type NotificationDayGroup,
} from '@/components/social/NotificationItemView'

const POLL_INTERVAL_MS = 5_000
const BANNER_DURATION_MS = 2_000

interface NotificationResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

type NotificationBanner =
  | { key: string; kind: 'single'; notification: NotificationItem }
  | { key: string; kind: 'summary'; count: number }

function BellSvg({ ringing }: { ringing: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ringing ? 'animate-bell-ring' : ''}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 border-y border-ns-border/30 bg-ns-bg/40 px-4 py-2">
      <p className="text-[10px] font-body font-semibold uppercase tracking-widest text-ns-muted/50">
        {label}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ns-border/40">
        <NotificationsIcon size={22} className="text-ns-muted/30" />
      </div>
      <p className="text-sm font-body text-ns-muted/60">No notifications yet</p>
      <p className="mt-1 text-xs font-body text-ns-muted/40">
        Follow people and rate movies to get started
      </p>
    </div>
  )
}

function TopBanner({
  banner,
  onSelect,
}: {
  banner: NotificationBanner
  onSelect: (notification: NotificationItem) => void
}) {
  const isSummary = banner.kind === 'summary'
  const href = isSummary ? '/notifications' : banner.notification.link
  const title = isSummary
    ? `You have ${banner.count} new notification${banner.count === 1 ? '' : 's'}`
    : banner.notification.title
  const body = isSummary
    ? 'Open Notifications to catch up.'
    : banner.notification.body

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[4.75rem] z-[70] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
      aria-live="polite"
      role="status"
    >
      <Link
        href={href}
        onClick={() => {
          if (!isSummary) onSelect(banner.notification)
        }}
        className="pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-ns-secondary/30 bg-ns-surface-2/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md transition-colors hover:border-ns-secondary/60"
        style={{ animation: 'notificationBannerIn 180ms ease-out both' }}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ns-secondary/12">
          {isSummary ? (
            <NotificationsIcon size={18} className="text-ns-secondary-readable" />
          ) : (
            <NotificationTypeIcon icon={banner.notification.icon} unread size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-body font-semibold text-ns-text">{title}</p>
          <p className="truncate text-xs font-body text-ns-muted/75">{body}</p>
        </div>
        <span className="flex-shrink-0 text-sm text-ns-secondary-readable" aria-hidden="true">→</span>
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ns-secondary"
          style={{ animation: 'notificationBannerTimer 2s linear both' }}
        />
      </Link>
    </div>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [bannerQueue, setBannerQueue] = useState<NotificationBanner[]>([])

  const panelRef = useRef<HTMLDivElement>(null)
  const knownIds = useRef(new Set<string>())
  const initialized = useRef(false)
  const refreshing = useRef(false)

  const enqueueBanners = useCallback((banners: NotificationBanner[]) => {
    if (banners.length > 0) setBannerQueue(current => [...current, ...banners])
  }, [])

  const refreshNotifications = useCallback(async (reason: 'initial' | 'poll' | 'return' | 'panel') => {
    if (refreshing.current) return
    refreshing.current = true

    try {
      const response = await fetch('/api/notifications?limit=50', { cache: 'no-store' })
      if (!response.ok) return

      const data = await response.json() as NotificationResponse
      const newlyArrived = data.notifications.filter(
        notification => !notification.read && !knownIds.current.has(notification.id),
      )

      for (const notification of data.notifications) knownIds.current.add(notification.id)
      setNotifications(data.notifications)
      setUnread(data.unreadCount)
      setLoaded(true)

      if (!initialized.current) {
        initialized.current = true
        if (data.unreadCount > 0) {
          enqueueBanners([{
            key: `initial-${Date.now()}`,
            kind: 'summary',
            count: data.unreadCount,
          }])
        }
        return
      }

      if (newlyArrived.length === 0) return

      setRinging(true)
      if (reason === 'return') {
        enqueueBanners([{
          key: `return-${Date.now()}`,
          kind: 'summary',
          count: newlyArrived.length,
        }])
      } else if (document.visibilityState === 'visible') {
        enqueueBanners(
          [...newlyArrived].reverse().map(notification => ({
            key: notification.id,
            kind: 'single' as const,
            notification,
          })),
        )
      }
    } catch {
      // Notification polling should never interrupt the rest of the app.
    } finally {
      refreshing.current = false
    }
  }, [enqueueBanners])

  useEffect(() => {
    void refreshNotifications('initial')

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshNotifications('poll')
    }, POLL_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshNotifications('return')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshNotifications])

  useEffect(() => {
    if (!ringing) return
    const timeoutId = window.setTimeout(() => setRinging(false), 650)
    return () => window.clearTimeout(timeoutId)
  }, [ringing])

  const activeBanner = bannerQueue[0]
  useEffect(() => {
    if (!activeBanner) return
    const timeoutId = window.setTimeout(() => {
      setBannerQueue(current => current.slice(1))
    }, BANNER_DURATION_MS)
    return () => window.clearTimeout(timeoutId)
  }, [activeBanner])

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const markOneRead = useCallback((notification: NotificationItem) => {
    if (notification.read) return

    setNotifications(current => current.map(item => (
      item.id === notification.id ? { ...item, read: true } : item
    )))
    setUnread(current => Math.max(0, current - 1))
    void fetch(`/api/notifications?id=${encodeURIComponent(notification.id)}`, {
      method: 'PATCH',
      keepalive: true,
    }).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
    setUnread(0)
    void fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
  }, [])

  const handleOpen = useCallback(() => {
    setOpen(current => {
      const next = !current
      if (next) void refreshNotifications('panel')
      return next
    })
  }, [refreshNotifications])

  const groups: Record<NotificationDayGroup, NotificationItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }
  for (const notification of notifications) {
    groups[notificationDayGroup(notification.createdAt)].push(notification)
  }

  const labels: Record<NotificationDayGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
  }

  return (
    <>
      {activeBanner && <TopBanner banner={activeBanner} onSelect={markOneRead} />}

      <div className="relative" ref={panelRef}>
        <button
          onClick={handleOpen}
          aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
          aria-expanded={open}
          className={`relative rounded-xl p-2 transition-all duration-200
            ${open
              ? 'bg-ns-secondary/10 text-ns-secondary-readable shadow-[0_0_12px_rgb(var(--ns-secondary)/0.15)]'
              : 'text-ns-muted hover:bg-ns-bg/50 hover:text-ns-text'
            }`}
        >
          <BellSvg ringing={ringing} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ns-secondary px-1 text-[9px] font-body font-bold text-white shadow-md shadow-ns-secondary/30">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div
            className="fixed left-4 right-4 top-[4.5rem] z-50 flex max-h-[calc(100svh-5.5rem)] w-auto flex-col overflow-hidden rounded-2xl border border-ns-border bg-ns-surface shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[520px] sm:w-[340px]"
            style={{ animation: 'szFadeIn 0.15s ease-out' }}
          >
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-ns-border px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <NotificationsIcon size={15} className="text-ns-secondary-readable/70" />
                <span className="text-xs font-body font-semibold uppercase tracking-wide text-ns-text">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="whitespace-nowrap text-[10px] font-body text-ns-muted/50">
                    {unread} unread
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-body text-ns-secondary-readable/80 transition-colors hover:text-ns-secondary-readable"
                  >
                    Mark all read
                  </button>
                )}
                <Link
                  href="/settings/notifications"
                  onClick={() => setOpen(false)}
                  className="text-[10px] font-body text-ns-muted/50 transition-colors hover:text-ns-secondary-readable"
                >
                  Settings
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!loaded ? (
                <div className="divide-y divide-ns-border/20">
                  {[1, 2, 3, 4].map(index => (
                    <div key={index} className="flex animate-pulse items-start gap-3 px-4 py-3.5">
                      <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-ns-border" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <div className="h-3 w-1/3 rounded bg-ns-border" />
                        <div className="h-2.5 w-3/4 rounded bg-ns-border" />
                        <div className="h-2 w-1/5 rounded bg-ns-border" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState />
              ) : (
                (['today', 'yesterday', 'earlier'] as const).map(group => (
                  groups[group].length > 0 && (
                    <div key={group}>
                      <GroupLabel label={labels[group]} />
                      <div className="divide-y divide-ns-border/20">
                        {groups[group].map(notification => (
                          <NotificationRow
                            key={notification.id}
                            notification={notification}
                            onSelect={item => {
                              markOneRead(item)
                              setOpen(false)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))
              )}
            </div>

            {loaded && notifications.length > 0 && (
              <div className="flex-shrink-0 border-t border-ns-border/50 px-4 py-2.5">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs font-body text-ns-muted/50 transition-colors hover:text-ns-secondary-readable"
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
