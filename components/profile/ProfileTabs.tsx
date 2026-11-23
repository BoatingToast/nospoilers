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
  { key: 'ratings', label: 'Ratings',      Icon: RatingsIcon      },
  { key: 'watchlist', label: 'Watchlist',    Icon: WatchlistIcon    },
  { key: 'collections', label: 'Collections',  Icon: CollectionsIcon  },
  { key: 'achievements', label: 'Achievements', Icon: AchievementsIcon },
]

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-xl bg-ns-surface" />
          <div className="mt-2.5 h-4 w-4/5 rounded-sm bg-ns-surface" />
        </div>
      ))}
    </div>
  )
}

export default function ProfileTabs({ username, ratingCount, watchlistCount }: Props) {
  const [active, setActive] = useState<Tab>('ratings')

  return (
    <div>
      <div role="group" aria-label="Profile library" className="-mx-4 mb-6 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            const count = key === 'ratings' ? ratingCount : key === 'watchlist' ? watchlistCount : 0
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(key)}
                className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-150 sm:min-h-10
                  ${isActive
                    ? 'bg-ns-text text-ns-bg'
                    : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
                  }`}
              >
                <Icon size={15} />
                {label}
                {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content — lazy loaded */}
      <div key={active} className="animate-fade-up">
        <Suspense fallback={<TabSkeleton />}>
          {active === 'ratings'      && <ProfileRatingsTab      username={username} />}
          {active === 'watchlist'    && <ProfileWatchlistTab    username={username} />}
          {active === 'collections'  && <ProfileCollectionsTab  username={username} />}
          {active === 'achievements' && <ProfileAchievementsTab username={username} />}
        </Suspense>
      </div>
    </div>
  )
}
