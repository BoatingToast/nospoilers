'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/ui/Button'
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
    <div className="space-y-10">
      <PageHeader title="Achievements" lede={<p>{earned.length} unlocked</p>}>
        <Button variant="outline" href="/achievements">
          Full page →
        </Button>
      </PageHeader>

      {xp && <XPBar level={xp} />}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-ns-surface-2" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {earned.length > 0 && (
            <Section title="Earned">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {earned.map(a => <AchievementCard key={a.slug} achievement={a} />)}
              </div>
            </Section>
          )}
          {inProgress.length > 0 && (
            <Section title="In Progress">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inProgress.slice(0, 6).map(a => <AchievementCard key={a.slug} achievement={a} />)}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
