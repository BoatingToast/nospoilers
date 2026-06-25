'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AchievementBadge from '@/components/achievements/AchievementBadge'
import XPBar from '@/components/achievements/XPBar'
import type { UserAchievementData, XPLevel } from '@/types'

export default function AchievementWidget() {
  const [achievements, setAchievements] = useState<UserAchievementData[]>([])
  const [xp,           setXP]           = useState<XPLevel | null>(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(data => {
        setAchievements(data.achievements ?? [])
        setXP(data.xp ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const earned      = achievements.filter(a => a.earned)
  const inProgress  = achievements.filter(a => !a.earned && a.progress > 0).slice(0, 3)
  const notStarted  = achievements.filter(a => !a.earned && a.progress === 0).slice(0, 2)
  const display     = [...earned.slice(-3), ...inProgress, ...notStarted].slice(0, 6)

  if (loading) {
    return (
      <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-4">Achievements</p>
        <div className="h-2 bg-ns-border rounded-full animate-pulse mb-6" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-ns-border" />
              <div className="h-2 bg-ns-border rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">
          Achievements · {earned.length}/{achievements.length}
        </p>
        <Link
          href="/achievements"
          className="text-ns-muted/50 text-[10px] font-body hover:text-ns-gold transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* XP bar */}
      {xp && (
        <div className="mb-5">
          <XPBar level={xp} />
        </div>
      )}

      {/* Achievement grid — each badge is now clickable */}
      <div className="grid grid-cols-6 gap-2">
        {display.map(a => (
          <AchievementBadge key={a.slug} achievement={a} size="sm" />
        ))}
      </div>

      {/* View all CTA */}
      <div className="mt-4 pt-4 border-t border-ns-border/40">
        <Link
          href="/achievements"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                     border border-ns-border/60 text-ns-muted text-xs font-body
                     hover:border-ns-gold/30 hover:text-ns-gold transition-all duration-200"
        >
          View All Achievements
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}
