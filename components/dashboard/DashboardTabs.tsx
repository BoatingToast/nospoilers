'use client'

import { useState, Suspense, lazy, type ReactNode } from 'react'
import type { DNAScores } from '@/types'
import {
  DashboardIcon,
  WatchlistIcon,
  RatingsIcon,
  AchievementsIcon,
  FriendsIcon,
  MovieDnaIcon,
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

type TabKey = 'overview' | 'watchlist' | 'ratings' | 'achievements' | 'friends' | 'dna' | 'wrapped'

interface TabDef {
  key:   TabKey
  label: string
  Icon:  React.ComponentType<{ size?: number; className?: string }>
}

const TABS: TabDef[] = [
  { key: 'overview',     label: 'Overview',     Icon: DashboardIcon     },
  { key: 'watchlist',    label: 'Watchlist',    Icon: WatchlistIcon     },
  { key: 'ratings',      label: 'Ratings',      Icon: RatingsIcon       },
  { key: 'achievements', label: 'Achievements', Icon: AchievementsIcon  },
  { key: 'friends',      label: 'Friends',      Icon: FriendsIcon       },
  { key: 'dna',          label: 'Movie DNA',    Icon: MovieDnaIcon      },
  { key: 'wrapped',      label: 'Wrapped',      Icon: WrappedIcon       },
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
  overview:  ReactNode
  dnaScores: DNAScores | null
  username:  string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardTabs({ overview, dnaScores, username }: Props) {
  const [active, setActive] = useState<TabKey>('overview')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-ns-border mb-8 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-body whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                ${isActive
                  ? 'border-ns-gold text-white'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
                }`}
            >
              <Icon size={16} className={isActive ? 'text-ns-gold' : 'text-current'} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {active === 'overview' && overview}

      {active !== 'overview' && (
        <Suspense fallback={<TabSkeleton />}>
          {active === 'watchlist'    && <WatchlistTab />}
          {active === 'ratings'      && <RatingsTab />}
          {active === 'achievements' && <AchievementsTab />}
          {active === 'friends'      && <FriendsFeedTab />}
          {active === 'dna'          && <MovieDNATab dnaScores={dnaScores} username={username} />}
          {active === 'wrapped'      && <WrappedTab />}
        </Suspense>
      )}
    </div>
  )
}
