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
          <div className="aspect-[2/3] bg-ns-border rounded-xl mb-2" />
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
      <div className="flex gap-1 border-b border-ns-border mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-body whitespace-nowrap border-b-2 transition-colors
                ${isActive
                  ? 'border-ns-gold text-white'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
                }`}
            >
              <Icon size={15} className={isActive ? 'text-ns-gold' : 'text-current'} />
              {label}
              {key === 'ratings'   && ratingCount    > 0 && (
                <span className="text-[10px] bg-ns-border px-1.5 py-0.5 rounded-full text-ns-muted">{ratingCount}</span>
              )}
              {key === 'watchlist' && watchlistCount > 0 && (
                <span className="text-[10px] bg-ns-border px-1.5 py-0.5 rounded-full text-ns-muted">{watchlistCount}</span>
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
