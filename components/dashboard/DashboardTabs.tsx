'use client'

import { useState, Suspense, lazy, type KeyboardEvent, type ReactNode } from 'react'
import type { MovieDnaProfile } from '@/types'
import {
  DashboardIcon,
  WatchlistIcon,
  RatingsIcon,
  AchievementsIcon,
  FriendsIcon,
  MovieDnaIcon,
  RecsIcon,
  UploadMovieIcon,
  WrappedIcon,
} from '@/components/icons'

// ─── Lazy tab imports ─────────────────────────────────────────────────────────

const WatchlistTab    = lazy(() => import('./tabs/WatchlistTab'))
const RatingsTab      = lazy(() => import('./tabs/RatingsTab'))
const AchievementsTab = lazy(() => import('./tabs/AchievementsTab'))
const FriendsFeedTab  = lazy(() => import('./tabs/FriendsFeedTab'))
const MovieDNATab     = lazy(() => import('./tabs/MovieDNATab'))
const WrappedTab      = lazy(() => import('./tabs/WrappedTab'))

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey =
  | 'overview'
  | 'recommendations'
  | 'watchlist'
  | 'ratings'
  | 'friends'
  | 'dna'
  | 'achievements'
  | 'wrapped'
  | 'creator'

interface TabDef {
  key:   TabKey
  label: string
  Icon:  React.ComponentType<{ size?: number; className?: string }>
}

const TABS: TabDef[] = [
  { key: 'overview',     label: 'Overview',     Icon: DashboardIcon     },
  { key: 'recommendations', label: 'For You',  Icon: RecsIcon          },
  { key: 'watchlist',    label: 'Watchlist',    Icon: WatchlistIcon     },
  { key: 'ratings',      label: 'Ratings',      Icon: RatingsIcon       },
  { key: 'friends',      label: 'Friends',      Icon: FriendsIcon       },
  { key: 'dna',          label: 'Movie DNA',    Icon: MovieDnaIcon      },
  { key: 'achievements', label: 'Achievements', Icon: AchievementsIcon  },
  { key: 'wrapped',      label: 'Wrapped',      Icon: WrappedIcon       },
  { key: 'creator',      label: 'Creator Studio', Icon: UploadMovieIcon },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-ns-surface border border-ns-border rounded-2xl h-32" />
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  overview: ReactNode
  recommendations: ReactNode
  friendsExtras: ReactNode
  dnaExtras: ReactNode
  creator: ReactNode
  dnaProfile: MovieDnaProfile | null
  username: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardTabs({
  overview,
  recommendations,
  friendsExtras,
  dnaExtras,
  creator,
  dnaProfile,
  username,
}: Props) {
  const [active, setActive] = useState<TabKey>('overview')

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: TabKey) {
    const currentIndex = TABS.findIndex(tab => tab.key === key)
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextKey = TABS[nextIndex].key
    setActive(nextKey)
    requestAnimationFrame(() => document.getElementById(`dashboard-tab-${nextKey}`)?.focus())
  }

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex gap-0.5 border-b border-ns-border mb-8 overflow-x-auto scrollbar-hide -mx-1 px-1"
      >
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              id={`dashboard-tab-${key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`dashboard-panel-${key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(key)}
              onKeyDown={event => handleTabKeyDown(event, key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-body whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                ${isActive
                  ? 'border-ns-secondary text-white'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
                }`}
            >
              <Icon size={16} className={isActive ? 'text-ns-secondary-readable' : 'text-current'} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div
        id={`dashboard-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${active}`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable/60"
      >
        {active === 'overview' && overview}
        {active === 'recommendations' && recommendations}
        {active === 'creator' && creator}

        {!['overview', 'recommendations', 'creator'].includes(active) && (
          <Suspense fallback={<TabSkeleton />}>
            {active === 'watchlist'    && <WatchlistTab />}
            {active === 'ratings'      && <RatingsTab />}
            {active === 'achievements' && <AchievementsTab />}
            {active === 'friends'      && <FriendsFeedTab extras={friendsExtras} />}
            {active === 'dna'          && <MovieDNATab dnaProfile={dnaProfile} username={username} extras={dnaExtras} />}
            {active === 'wrapped'      && <WrappedTab />}
          </Suspense>
        )}
      </div>
    </div>
  )
}
