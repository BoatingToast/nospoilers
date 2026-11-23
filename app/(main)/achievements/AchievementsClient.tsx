'use client'

import { useState, useMemo } from 'react'
import AchievementCard from '@/components/achievements/AchievementCard'
import XPBar from '@/components/achievements/XPBar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { PillTabs, revealDelay } from '@/components/watchlist/LibraryControls'
import type { UserAchievementData, XPLevel, AchievementCategory } from '@/types'

type StatusFilter = 'all' | 'earned' | 'in-progress' | 'locked'
type CategoryFilter = AchievementCategory | 'all'

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watching', label: 'Watching' },
  { value: 'genres', label: 'Genres' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'collections', label: 'Collections' },
  { value: 'social', label: 'Social' },
]

interface Props {
  achievements: UserAchievementData[]
  xp:           XPLevel
}

export default function AchievementsClient({ achievements, xp }: Props) {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [status,   setStatus]   = useState<StatusFilter>('all')

  const earned     = achievements.filter(a => a.earned)
  const inProgress = achievements.filter(a => !a.earned && a.progress > 0)
  const locked     = achievements.filter(a => !a.earned && a.progress === 0)

  const filtered = useMemo(() => {
    let list = achievements

    if (category !== 'all') {
      list = list.filter(a => a.category === category)
    }

    if (status === 'earned')      list = list.filter(a => a.earned)
    if (status === 'in-progress') list = list.filter(a => !a.earned && a.progress > 0)
    if (status === 'locked')      list = list.filter(a => !a.earned && a.progress === 0)

    // Sort: earned first (by date desc), then in-progress (by % desc), then locked
    return [...list].sort((a, b) => {
      if (a.earned && !b.earned) return -1
      if (!a.earned && b.earned) return 1
      if (a.earned && b.earned) {
        return (b.earnedAt ?? '').localeCompare(a.earnedAt ?? '')
      }
      const aPct = a.progress / a.goal
      const bPct = b.progress / b.goal
      return bPct - aPct
    })
  }, [achievements, category, status])

  const statusOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: achievements.length },
    { value: 'earned', label: 'Completed', count: earned.length },
    { value: 'in-progress', label: 'In progress', count: inProgress.length },
    { value: 'locked', label: 'Locked', count: locked.length },
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <PageHeader className="mb-8" title="Achievements." />

      <section aria-label="Your level" className="mb-10 rounded-3xl bg-ns-surface p-7 sm:p-10">
        <XPBar level={xp} size="lg" />
      </section>

      <div className="mb-6 flex flex-col gap-3">
        <PillTabs label="Filter by status" options={statusOptions} value={status} onChange={setStatus} />
        <PillTabs label="Filter by category" options={CATEGORIES} value={category} onChange={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No achievements in this filter."
          description="Try a different status or category."
          action={<Button variant="secondary" onClick={() => { setCategory('all'); setStatus('all') }}>Show all achievements</Button>}
        />
      ) : (
        <div key={`${category}-${status}`} className="grid animate-fade-up gap-3 md:grid-cols-2">
          {filtered.map((a, index) => (
            <div key={a.slug} className={index > 5 ? 'ns-reveal' : undefined} style={index > 5 ? revealDelay(index) : undefined}>
              <AchievementCard achievement={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
