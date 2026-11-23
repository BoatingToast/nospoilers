'use client'

import { useState, useEffect } from 'react'
import { SectionLink } from './SectionHeading'
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

  return (
    <section aria-labelledby="achievement-widget-title" className="rounded-2xl bg-ns-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="achievement-widget-title" className="font-heading text-xl font-bold text-ns-text">
          Achievements <span className="font-body text-base font-normal tabular-nums text-ns-muted">{earned.length}/{achievements.length}</span>
        </h2>
        <SectionLink href="/achievements">View all</SectionLink>
      </div>

      {loading ? (
        <div aria-hidden="true" className="animate-pulse">
          <div className="mb-6 h-2 rounded-full bg-ns-surface-2" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mx-auto h-10 w-10 rounded-full bg-ns-surface-2" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {xp && <div className="mb-5"><XPBar level={xp} /></div>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {display.map(a => (
              <AchievementBadge key={a.slug} achievement={a} size="sm" />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
