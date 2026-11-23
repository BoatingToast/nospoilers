'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { ArrowRightIcon, NotificationsIcon, SettingsIcon } from '@/components/icons'
import type { NotificationItem } from '@/services/notifications'
import {
  NotificationRow,
  NotificationTypeIcon,
  notificationDayGroup,
  type NotificationDayGroup,
} from '@/components/social/NotificationItemView'

const POLL_INTERVAL_MS = 5_000
const BANNER_DURATION_MS = 2_000
const BANNER_EXIT_MS = 240

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
      aria-hidden="true"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ringing ? 'origin-top animate-bell-ring motion-reduce:animate-none' : ''}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="sticky top-0 z-10 bg-ns-surface px-4 pb-1 pt-3 text-sm font-semibold text-ns-muted">
      {label}
    </p>
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-heading text-lg font-bold text-ns-text">No notifications yet</p>
      <p className="mt-1 text-sm text-ns-muted">
        Follow people and rate movies to get started
      </p>
    </div>
  )
}

/**
 * New-notification toast. Rendered through a portal because the site header
 * gains a transform when it tucks away, which would otherwise re-anchor
 * `fixed` children to the header. It sits bottom-left on larger screens, clear
 * of the achievement toasts (bottom-right), and along the bottom edge on phones,
 * clear of bottom composers and save bars. Its z-index stays below modals.
 */
function NotificationToast({
  banner,
  leaving,
  onSelect,
}: {
  banner: NotificationBanner
  leaving: boolean
  onSelect: (notification: NotificationItem) => void
}) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const isSummary = banner.kind === 'summary'
  const href = isSummary ? '/notifications' : banner.notification.link
  const title = isSummary
    ? `You have ${banner.count} new notification${banner.count === 1 ? '' : 's'}`
    : banner.notification.title
  const body = isSummary
    ? 'Open Notifications to catch up.'
    : banner.notification.body
  const shown = entered && !leaving

  return (
    <Link
      href={href}
      onClick={() => {
        if (!isSummary) onSelect(banner.notification)
      }}
      className={`pointer-events-auto relative flex min-h-16 items-center gap-3 overflow-hidden rounded-2xl bg-ns-surface-3 py-3 pl-3 pr-4 shadow-2xl
        transition-[opacity,transform,background-color] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-ns-surface-2 motion-reduce:transition-none
        ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      {!isSummary && banner.notification.actorUsername ? (
        <Avatar
          src={banner.notification.actorAvatarUrl}
          username={banner.notification.actorUsername}
          size="sm"
        />
      ) : (
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-2">
          {isSummary ? (
            <NotificationsIcon size={18} className="text-ns-secondary-readable" />
          ) : (
            <NotificationTypeIcon icon={banner.notification.icon} unread size={18} />
          )}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ns-text">{title}</span>
        <span className="block truncate text-sm text-ns-muted">{body}</span>
      </span>
      <ArrowRightIcon size={16} className="flex-shrink-0 text-ns-secondary-readable" />
      <span
        aria-hidden="true"
        className="ns-progress absolute inset-x-0 bottom-0 h-0.5 bg-ns-secondary"
        style={{ '--ns-progress-duration': `${BANNER_DURATION_MS}ms` } as React.CSSProperties}
      />
    </Link>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [bannerQueue, setBannerQueue] = useState<NotificationBanner[]>([])
  const [bannerLeaving, setBannerLeaving] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

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

  useEffect(() => setPortalReady(true), [])

  const activeBanner = bannerQueue[0]
  useEffect(() => {
    if (!activeBanner) return
    setBannerLeaving(false)
    const leaveId = window.setTimeout(() => setBannerLeaving(true), BANNER_DURATION_MS)
    const removeId = window.setTimeout(() => {
      setBannerQueue(current => current.slice(1))
    }, BANNER_DURATION_MS + BANNER_EXIT_MS)
    return () => {
      window.clearTimeout(leaveId)
      window.clearTimeout(removeId)
    }
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
      {portalReady && createPortal(
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:left-6 sm:w-96"
        >
          {activeBanner && (
            <NotificationToast
              key={activeBanner.key}
              banner={activeBanner}
              leaving={bannerLeaving}
              onSelect={markOneRead}
            />
          )}
        </div>,
        document.body,
      )}

      {/* Static on phones so the panel anchors to the full-width header. */}
      <div className="static sm:relative" ref={panelRef}>
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
          aria-expanded={open}
          className={`relative flex h-11 w-11 items-center justify-center rounded-full text-ns-text transition-colors duration-150 xl:h-10 xl:w-10
            ${open ? 'bg-ns-text/10' : 'hover:bg-ns-text/5'}`}
        >
          <BellSvg ringing={ringing} />
          {unread > 0 && (
            <span
              key={unread}
              className="absolute right-0 top-0 flex h-[18px] min-w-[18px] animate-fade-up items-center justify-center rounded-full bg-ns-accent px-1 text-xs font-bold tabular-nums leading-none text-ns-secondary-foreground"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute inset-x-4 top-full z-50 mt-2 flex max-h-[calc(100dvh-7.5rem)] animate-fade-up flex-col overflow-hidden rounded-2xl bg-ns-surface shadow-2xl sm:inset-x-auto sm:right-0 sm:max-h-[32rem] sm:w-96">
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-ns-border py-2 pl-4 pr-2">
              <p className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold text-ns-text">
                <span className="truncate">Notifications</span>
                {unread > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-ns-surface-3 px-2 py-0.5 font-body text-xs font-semibold tabular-nums text-ns-text">
                    {unread}<span className="sr-only"> unread</span>
                  </span>
                )}
              </p>
              <div className="flex flex-shrink-0 items-center">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-surface-2 sm:min-h-10"
                  >
                    Mark all read
                  </button>
                )}
                <Link
                  href="/settings/notifications"
                  onClick={() => setOpen(false)}
                  aria-label="Notification settings"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text sm:h-10 sm:w-10"
                >
                  <SettingsIcon size={18} />
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!loaded ? (
                <div className="divide-y divide-ns-border">
                  {[1, 2, 3, 4].map(index => (
                    <div key={index} className="flex animate-pulse items-start gap-3 px-4 py-3">
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3.5 w-1/3 rounded-sm bg-ns-surface-2" />
                        <div className="h-3 w-3/4 rounded-sm bg-ns-surface-2" />
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
                      <div>
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
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex min-h-12 flex-shrink-0 items-center justify-center gap-2 border-t border-ns-border text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-2"
              >
                View all notifications
                <ArrowRightIcon size={14} />
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
