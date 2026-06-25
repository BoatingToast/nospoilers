'use client'

import { useState, useMemo } from 'react'
import AchievementCard from '@/components/achievements/AchievementCard'
import XPBar from '@/components/achievements/XPBar'
import type { UserAchievementData, XPLevel, AchievementCategory } from '@/types'
import {
  AchievementsIcon, FilmIcon, CompassIcon, MovieDnaIcon,
  CollectionsIcon, FriendsIcon, RecsIcon,
  type IconProps,
} from '@/components/icons'

type StatusFilter = 'all' | 'earned' | 'in-progress' | 'locked'

const CATEGORIES: { value: AchievementCategory | 'all'; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { value: 'all',         label: 'All',         Icon: AchievementsIcon },
  { value: 'watching',    label: 'Watching',    Icon: FilmIcon          },
  { value: 'genres',      label: 'Genres',      Icon: CompassIcon       },
  { value: 'discovery',   label: 'Discovery',   Icon: MovieDnaIcon      },
  { value: 'collections', label: 'Collections', Icon: CollectionsIcon   },
  { value: 'social',      label: 'Social',      Icon: FriendsIcon       },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: 'All'        },
  { value: 'earned',      label: 'Completed'  },
  { value: 'in-progress', label: 'In Progress'},
  { value: 'locked',      label: 'Locked'     },
]

interface Props {
  achievements: UserAchievementData[]
  xp:           XPLevel
}

export default function AchievementsClient({ achievements, xp }: Props) {
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">

      {/* Page header */}
      <div className="mb-8">
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Your Progress</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-6">
          ACHIEVEMENTS
        </h1>

        {/* XP bar */}
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-5 mb-6">
          <XPBar level={xp} />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed',   value: earned.length,     color: 'text-ns-gold'    },
            { label: 'In Progress', value: inProgress.length, color: 'text-blue-400'   },
            { label: 'Locked',      value: locked.length,     color: 'text-ns-muted'   },
          ].map(s => (
            <div key={s.label}
                 className="bg-ns-surface border border-ns-border rounded-xl p-3 text-center">
              <p className={`font-display text-3xl tracking-wider ${s.color}`}>{s.value}</p>
              <p className="text-ns-muted text-[10px] font-body tracking-widest uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value as AchievementCategory | 'all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body
                        whitespace-nowrap transition-all duration-200 flex-shrink-0
                        ${category === cat.value
                          ? 'bg-ns-gold text-ns-bg font-medium'
                          : 'bg-ns-surface border border-ns-border text-ns-muted hover:border-ns-gold/30 hover:text-ns-text'
                        }`}
          >
            <cat.Icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={`px-3 py-1 rounded-lg text-xs font-body transition-all duration-200
                        ${status === s.value
                          ? 'bg-ns-surface border border-ns-gold/40 text-ns-gold'
                          : 'text-ns-muted hover:text-ns-text'
                        }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Achievement list */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
          <RecsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
          <p className="text-ns-muted font-body text-sm">No achievements in this filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(a => (
            <AchievementCard key={a.slug} achievement={a} />
          ))}
        </div>
      )}
    </div>
  )
}
