'use client'

import { useState, Suspense, lazy } from 'react'
import {
  RatingsIcon,
  WatchlistIcon,
  CollectionsIcon,
  AchievementsIcon,
  type IconProps,
} from '@/components/icons'

const ProfileRatingsTab      = lazy(() => import('./tabs/ProfileRatingsTab'))
const ProfileWatchlistTab    = lazy(() => import('./tabs/ProfileWatchlistTab'))
const ProfileCollectionsTab  = lazy(() => import('./tabs/ProfileCollectionsTab'))
const ProfileAchievementsTab = lazy(() => import('./tabs/ProfileAchievementsTab'))

type Tab = 'ratings' | 'watchlist' | 'collections' | 'achievements'

interface Props {
  username:       string
  ratingCount:    number
  watchlistCount: number
}

interface TabDef {
  key:   Tab
  label: string
  Icon:  React.ComponentType<IconProps>
}

const TABS: TabDef[] = [
  { key: 'ratings',      label: 'Ratings',      Icon: RatingsIcon      },
  { key: 'watchlist',    label: 'Watchlist',    Icon: WatchlistIcon    },
  { key: 'collections',  label: 'Collections',  Icon: CollectionsIcon  },
  { key: 'achievements', label: 'Achievements', Icon: AchievementsIcon },
]

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-ns-border rounded mb-2" />
          <div className="h-3 bg-ns-border rounded w-4/5" />
        </div>
      ))}
    </div>
  )
}

export default function ProfileTabs({ username, ratingCount, watchlistCount }: Props) {
  const [active, setActive] = useState<Tab>('ratings')

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 grid grid-cols-2 border-b border-ns-border sm:flex sm:gap-6">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          const count = key === 'ratings' ? ratingCount : key === 'watchlist' ? watchlistCount : 0
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`-mb-px flex min-h-[44px] items-center gap-1.5 border-b-2 py-3 text-sm font-heading whitespace-nowrap transition-colors
                ${isActive
                  ? 'border-ns-secondary text-white'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
                }`}
            >
              <Icon size={15} className={isActive ? 'text-ns-secondary-readable' : 'text-current'} />
              {label}
              {count > 0 && (
                <span className="text-xs font-body text-ns-muted">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content — lazy loaded */}
      <Suspense fallback={<TabSkeleton />}>
        {active === 'ratings'      && <ProfileRatingsTab      username={username} />}
        {active === 'watchlist'    && <ProfileWatchlistTab    username={username} />}
        {active === 'collections'  && <ProfileCollectionsTab  username={username} />}
        {active === 'achievements' && <ProfileAchievementsTab username={username} />}
      </Suspense>
    </div>
  )
}
