'use client'

import { useEffect, useRef, useState, Suspense, lazy, type KeyboardEvent, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import type { MovieDnaProfile } from '@/types'

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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'recommendations', label: 'For You' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'friends', label: 'Friends' },
  { key: 'dna', label: 'Movie DNA' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'wrapped', label: 'Wrapped' },
]

const TAB_CLASSES = 'inline-flex min-h-11 flex-shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
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
  dnaProfile: MovieDnaProfile | null
  username: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardTabs({
  overview,
  recommendations,
  friendsExtras,
  dnaExtras,
  dnaProfile,
  username,
}: Props) {
  const [active, setActive] = useState<TabKey>('overview')
  const [indicator, setIndicator] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // The selected pill is a second copy of the labels, clipped to the active tab,
  // so it slides between tabs and inverts the text it passes over.
  useEffect(() => {
    const list = listRef.current
    const tab = document.getElementById(`dashboard-tab-${active}`)
    if (!list || !tab) return

    const measure = () => {
      const right = list.offsetWidth - tab.offsetLeft - tab.offsetWidth
      setIndicator(`inset(0 ${right}px 0 ${tab.offsetLeft}px round 999px)`)
    }
    measure()

    const scroller = list.parentElement
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scroller.scrollTo({
        left: tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2,
        behavior: reduced ? 'auto' : 'smooth',
      })
    }

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [active])

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
      <div className="-mx-4 mb-8 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Dashboard sections"
          className="relative flex w-max gap-1"
        >
          {TABS.map(({ key, label }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                id={`dashboard-tab-${key}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`dashboard-panel-${key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(key)}
                onKeyDown={event => handleTabKeyDown(event, key)}
                className={`${TAB_CLASSES} transition-colors duration-150 ${
                  isActive
                    ? indicator ? 'text-ns-text' : 'bg-ns-text text-ns-bg'
                    : 'text-ns-muted [@media(hover:hover)]:hover:bg-ns-surface-2 [@media(hover:hover)]:hover:text-ns-text'
                }`}
              >
                {label}
              </button>
            )
          })}

          {indicator && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex gap-1 bg-ns-text text-ns-bg transition-[clip-path] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
              style={{ clipPath: indicator }}
            >
              {TABS.map(({ key, label }) => (
                <span key={key} className={TAB_CLASSES}>{label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab content. The fade must not fill forwards: a lingering transform or
          stacking context would trap the modals rendered inside these panels. */}
      <div
        key={active}
        id={`dashboard-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${active}`}
        tabIndex={0}
        className="rounded-2xl motion-safe:animate-[fadeUp_320ms_cubic-bezier(0.23,1,0.32,1)_backwards]"
      >
        {active === 'overview' && overview}
        {active === 'recommendations' && recommendations}
        {!['overview', 'recommendations'].includes(active) && (
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
