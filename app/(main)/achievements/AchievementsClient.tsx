'use client'

import { useState, useMemo } from 'react'
import AchievementCard from '@/components/achievements/AchievementCard'
import XPBar from '@/components/achievements/XPBar'
import PageHeader from '@/components/ui/PageHeader'
import type { UserAchievementData, XPLevel, AchievementCategory } from '@/types'
import {
  AchievementsIcon, FilmIcon, CompassIcon, MovieDnaIcon,
  CollectionsIcon, FriendsIcon,
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
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 sm:px-6">

      <PageHeader
        title="ACHIEVEMENTS"
        lede="Your progress across watching, genres, discovery, collections and social."
      >
        <dl className="grid w-full grid-cols-3 gap-4">
          {[
            { label: 'Completed',   value: earned.length,     color: 'text-ns-secondary-readable'    },
            { label: 'In Progress', value: inProgress.length, color: 'text-blue-400'   },
            { label: 'Locked',      value: locked.length,     color: 'text-ns-muted'   },
          ].map(s => (
            <div key={s.label} className="min-w-0">
              <dd className={`font-display text-4xl leading-none tracking-wide ${s.color}`}>{s.value}</dd>
              <dt className="mt-1 font-body text-[11px] uppercase tracking-widest text-ns-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 lg:order-1">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-x-5 border-b border-ns-border">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value as AchievementCategory | 'all')}
                aria-pressed={category === cat.value}
                className={`-mb-px flex min-h-10 items-center gap-1.5 whitespace-nowrap border-b-2 font-heading text-sm transition-colors
                            ${category === cat.value
                              ? 'border-ns-text font-semibold text-ns-text'
                              : 'border-transparent text-ns-muted hover:text-ns-text'
                            }`}
              >
                <cat.Icon size={12} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="mb-4 flex flex-wrap gap-x-5">
            {STATUS_FILTERS.map(s => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                aria-pressed={status === s.value}
                className={`min-h-10 font-body text-xs underline-offset-4 transition-colors
                            ${status === s.value
                              ? 'text-ns-secondary-readable underline'
                              : 'text-ns-muted hover:text-ns-text'
                            }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Achievement list */}
          {filtered.length === 0 ? (
            <p className="border-t border-ns-border py-10 font-body text-sm text-ns-muted">No achievements in this filter.</p>
          ) : (
            <div className="border-b border-ns-border">
              {filtered.map(a => (
                <AchievementCard key={a.slug} achievement={a} />
              ))}
            </div>
          )}
        </div>

        {/* XP */}
        <aside className="order-1 min-w-0 border-t-2 border-ns-text pt-4 lg:order-2 lg:self-start">
          <XPBar level={xp} />
        </aside>
      </div>
    </div>
  )
}
