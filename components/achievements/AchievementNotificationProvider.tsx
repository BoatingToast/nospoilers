'use client'

/**
 * AchievementNotificationProvider
 *
 * Mounts invisibly in the root layout (client-side only).
 * On each page load it fetches /api/achievements and compares the earned list
 * against what's stored in localStorage('ns-earned-achievements').
 * Any newly-earned achievement triggers a toast notification that auto-dismisses
 * after 5 seconds. Up to 3 notifications can stack.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { UserAchievementData, AchievementRarity } from '@/types'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

const STORAGE_KEY = 'ns-earned-achievements'

const RARITY_ACCENT: Record<AchievementRarity, string> = {
  common:    'border-ns-border',
  rare:      'border-ns-info/50',
  epic:      'border-ns-tier-epic/50',
  legendary: 'border-ns-secondary/60',
}

interface Notification {
  id:          string
  achievement: UserAchievementData
  exiting:     boolean
}

export default function AchievementNotificationProvider() {
  const { status } = useSession()
  const pathname   = usePathname()
  const [queue,      setQueue]      = useState<Notification[]>([])
  const [modalItem,  setModalItem]  = useState<UserAchievementData | null>(null)

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setQueue(q => q.map(n => n.id === id ? { ...n, exiting: true } : n))
    setTimeout(() => setQueue(q => q.filter(n => n.id !== id)), 400)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return

    async function check() {
      try {
        const res  = await fetch('/api/achievements')
        if (!res.ok) return
        const data = await res.json()
        const achievements: UserAchievementData[] = data.achievements ?? []

        const earned = achievements.filter(a => a.earned).map(a => a.slug)
        const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')

        const newlyEarned = earned.filter(slug => !stored.includes(slug))

        if (newlyEarned.length > 0) {
          // Update storage first so we never double-notify
          localStorage.setItem(STORAGE_KEY, JSON.stringify(earned))

          const newNotifs: Notification[] = newlyEarned
            .map(slug => achievements.find(a => a.slug === slug))
            .filter(Boolean)
            .slice(0, 3)     // show max 3 at once
            .map(a => ({ id: `${a!.slug}-${Date.now()}`, achievement: a!, exiting: false }))

          setQueue(prev => [...prev, ...newNotifs].slice(-3))

          // Auto-dismiss after 5 s
          newNotifs.forEach(n => {
            setTimeout(() => dismiss(n.id), 5000)
          })
        } else if (stored.length === 0 && earned.length > 0) {
          // First visit after earning achievements — seed storage silently
          localStorage.setItem(STORAGE_KEY, JSON.stringify(earned))
        }
      } catch {
        // Silent fail — notifications are non-critical
      }
    }

    check()
  // pathname is included so we re-check after every client-side navigation.
  // This catches achievements earned during the current session (e.g. user marks
  // a movie watched then navigates away — the next route change triggers the diff).
  }, [status, pathname, dismiss])

  if (queue.length === 0) return null

  return (
    <>
      {/* Toast stack — bottom-right */}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-end gap-3 sm:bottom-6 sm:left-auto sm:right-6">
        {queue.map(notif => (
          <div
            key={notif.id}
            className={`
              pointer-events-auto flex w-full max-w-[320px] items-start gap-3 rounded border border-t-2 bg-ns-bg px-4 py-3
              transition-opacity duration-300
              ${RARITY_ACCENT[notif.achievement.rarity]}
              ${notif.exiting ? 'opacity-0' : 'opacity-100'}
            `}
          >
            {/* Icon */}
            <span className="flex-shrink-0 text-xl leading-none">
              {notif.achievement.icon}
            </span>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold text-ns-text">
                {notif.achievement.name}
              </p>
              <p className="font-body text-xs text-ns-muted">
                <span className="text-ns-secondary-readable">Achievement Unlocked!</span> · +{notif.achievement.xpReward} XP
              </p>
              <button
                onClick={() => { setModalItem(notif.achievement); dismiss(notif.id) }}
                className="mt-1 inline-flex min-h-8 items-center whitespace-nowrap font-heading text-xs text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
              >
                View →
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismiss(notif.id)}
              aria-label="Dismiss"
              className="-mr-2 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
            >
              <svg aria-hidden="true" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Detail modal triggered from "View →" */}
      {modalItem && (
        <AchievementDetailModal
          achievement={modalItem}
          onClose={() => setModalItem(null)}
          isNew
        />
      )}
    </>
  )
}
