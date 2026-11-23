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
import { CloseIcon, getAchievementIcon } from '@/components/icons'

const AchievementDetailModal = dynamic(() => import('./AchievementDetailModal'), { ssr: false })

const STORAGE_KEY = 'ns-earned-achievements'

const RARITY_TILE: Record<AchievementRarity, string> = {
  common:    'bg-ns-surface-3',
  rare:      'bg-ns-tile-blue',
  epic:      'bg-ns-tile-lilac',
  legendary: 'bg-ns-tile-rose',
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

  if (queue.length === 0 && !modalItem) return null

  return (
    <>
      {/* Toast stack — bottom-right */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6">
        {queue.map(notif => {
          const AchIcon = getAchievementIcon(notif.achievement.slug)
          return (
            <div
              key={notif.id}
              role="status"
              className={`pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-ns-surface-2 py-2 pl-3 pr-2 shadow-2xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:w-80 ${
                notif.exiting ? 'translate-x-4 opacity-0' : 'animate-fade-up'
              }`}
            >
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${RARITY_TILE[notif.achievement.rarity]}`}>
                <AchIcon size={20} className="text-ns-text" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ns-secondary-readable">Achievement Unlocked!</p>
                <p className="truncate font-heading text-sm font-semibold text-ns-text">{notif.achievement.name}</p>
                <p className="text-xs tabular-nums text-ns-muted">+{notif.achievement.xpReward} XP</p>
              </div>

              <button
                type="button"
                onClick={() => { setModalItem(notif.achievement); dismiss(notif.id) }}
                className="min-h-11 flex-shrink-0 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
              >
                View
              </button>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(notif.id)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          )
        })}
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
