'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AchievementCard from '@/components/achievements/AchievementCard'
import XPBar from '@/components/achievements/XPBar'
import type { UserAchievementData, XPLevel } from '@/types'

export default function AchievementsTab() {
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

  const earned     = achievements.filter(a => a.earned)
  const inProgress = achievements.filter(a => !a.earned && a.progress > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-ns-muted text-xs font-body">{earned.length} unlocked</p>
        <Link href="/achievements" className="text-xs font-body text-ns-muted hover:text-ns-gold transition-colors">
          Full page →
        </Link>
      </div>

      {xp && <div className="mb-6"><XPBar level={xp} /></div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-ns-surface border border-ns-border rounded-2xl h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {earned.length > 0 && (
            <div>
              <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest mb-3">Earned</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {earned.map(a => <AchievementCard key={a.slug} achievement={a} />)}
              </div>
            </div>
          )}
          {inProgress.length > 0 && (
            <div>
              <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest mb-3">In Progress</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inProgress.slice(0, 6).map(a => <AchievementCard key={a.slug} achievement={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
