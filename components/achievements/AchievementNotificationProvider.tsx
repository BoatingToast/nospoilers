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
  rare:      'border-blue-500/50',
  epic:      'border-purple-500/50',
  legendary: 'border-ns-gold/60',
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
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {queue.map(notif => (
          <div
            key={notif.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 px-4 py-3 rounded-2xl
              bg-ns-bg border shadow-2xl shadow-black/60
              transition-all duration-400
              ${RARITY_ACCENT[notif.achievement.rarity]}
              ${notif.exiting
                ? 'opacity-0 translate-x-4 scale-95'
                : 'opacity-100 translate-x-0 scale-100'
              }
            `}
            style={{ maxWidth: 320 }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-ns-surface border border-ns-gold/30
                            flex items-center justify-center text-xl flex-shrink-0
                            shadow-[0_0_12px_rgba(200,150,62,0.3)]">
              {notif.achievement.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-ns-gold text-[10px] font-body tracking-widest uppercase mb-0.5">
                Achievement Unlocked!
              </p>
              <p className="text-ns-text text-sm font-body font-medium truncate">
                {notif.achievement.name}
              </p>
              <p className="text-ns-muted text-[11px] font-body">
                +{notif.achievement.xpReward} XP
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <button
                onClick={() => dismiss(notif.id)}
                className="text-ns-muted hover:text-ns-text transition-colors"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <button
                onClick={() => { setModalItem(notif.achievement); dismiss(notif.id) }}
                className="text-ns-gold text-[10px] font-body hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                View →
              </button>
            </div>
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
