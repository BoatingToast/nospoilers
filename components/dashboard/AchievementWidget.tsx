'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
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
      <Section title="Achievements">
        <div className="mb-6 h-2 animate-pulse rounded bg-ns-surface-2" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse flex-col items-center gap-1.5">
              <div className="h-10 w-10 rounded-full bg-ns-surface-2" />
              <div className="h-2 w-full rounded bg-ns-surface-2" />
            </div>
          ))}
        </div>
      </Section>
    )
  }

  return (
    <Section
      title="Achievements"
      note={`${earned.length}/${achievements.length}`}
      href="/achievements"
      linkLabel="View all →"
    >
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
      <div className="mt-4 border-t border-ns-border pt-4">
        <Button variant="outline" href="/achievements" className="w-full sm:w-auto">
          View All Achievements
        </Button>
      </div>
    </Section>
  )
}
