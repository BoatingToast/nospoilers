'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import SectionHeading, { SectionLink } from '../SectionHeading'
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
      <SectionHeading
        title={`${earned.length} unlocked`}
        action={<SectionLink href="/achievements">Full page</SectionLink>}
      />

      {xp && <div className="mb-8 rounded-2xl bg-ns-surface p-6"><XPBar level={xp} /></div>}

      {loading ? (
        <div aria-hidden="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : earned.length === 0 && inProgress.length === 0 ? (
        <EmptyState
          title="No achievements yet"
          description="Rate and watch movies to start earning badges."
          action={<Button variant="secondary" href="/discover" className="bg-ns-surface-2 hover:bg-ns-surface-3">Discover movies</Button>}
        />
      ) : (
        <div className="space-y-8">
          {earned.length > 0 && (
            <section>
              <h3 className="mb-3 font-heading text-xl font-bold text-ns-text">Earned</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {earned.map((a, index) => (
                  <div key={a.slug} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
                    <AchievementCard achievement={a} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {inProgress.length > 0 && (
            <section>
              <h3 className="mb-3 font-heading text-xl font-bold text-ns-text">In progress</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {inProgress.slice(0, 6).map((a, index) => (
                  <div key={a.slug} className="ns-reveal" style={{ '--i': index } as React.CSSProperties}>
                    <AchievementCard achievement={a} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
