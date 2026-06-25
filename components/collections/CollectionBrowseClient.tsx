'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'
import {
  TrendingIcon, PopularIcon, WrappedIcon, AchievementsIcon, FilmIcon, FriendsIcon,
  CollectionsIcon, type IconProps,
} from '@/components/icons'

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'trending' | 'popular' | 'newest' | 'most_upvoted' | 'most_movies' | 'following'

interface TabConfig {
  key:           TabKey
  label:         string
  Icon:          React.ComponentType<IconProps>
  api:           string
  authRequired?: boolean
}

const TABS: TabConfig[] = [
  { key: 'trending',     label: 'Trending',     Icon: TrendingIcon,     api: '/api/collections/trending' },
  { key: 'popular',     label: 'Popular',       Icon: PopularIcon,      api: '/api/collections?tab=popular' },
  { key: 'newest',      label: 'Newest',        Icon: WrappedIcon,      api: '/api/collections?tab=newest' },
  { key: 'most_upvoted', label: 'Most Upvoted', Icon: AchievementsIcon, api: '/api/collections?tab=most_upvoted' },
  { key: 'most_movies', label: 'Most Movies',   Icon: FilmIcon,         api: '/api/collections?tab=most_movies' },
  { key: 'following',   label: 'Following',     Icon: FriendsIcon,      api: '/api/collections?tab=following', authRequired: true },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-xl bg-ns-border mb-3" />
          <div className="h-3 bg-ns-border rounded w-4/5 mb-1.5" />
          <div className="h-2.5 bg-ns-border rounded w-2/5" />
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialTab?: TabKey
}

export default function CollectionBrowseClient({ initialTab = 'trending' }: Props) {
  const { status } = useSession()
  const [activeTab,    setActiveTab]    = useState<TabKey>(initialTab)
  const [collections,  setCollections]  = useState<EnrichedCollectionData[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)

  const activeConfig = TABS.find(t => t.key === activeTab)!

  const fetchTab = useCallback(async (tab: typeof TABS[number]) => {
    setLoading(true)
    setError(false)
    try {
      const res  = await fetch(tab.api)
      const data = await res.json()
      setCollections(Array.isArray(data) ? data : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTab(activeConfig)
  }, [activeTab, fetchTab, activeConfig])

  function switchTab(key: TabKey) {
    if (key === activeTab) return
    setActiveTab(key)
    setCollections([])
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto -mx-6 px-6 mb-8 scrollbar-hide">
        <div className="flex gap-1 border-b border-ns-border w-full pb-0">
          {TABS.map(tab => {
            if (tab.authRequired && status !== 'authenticated') return null
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-body whitespace-nowrap
                            border-b-2 -mb-px transition-all duration-150 flex-shrink-0
                            ${isActive
                              ? 'border-ns-gold text-ns-gold'
                              : 'border-transparent text-ns-muted hover:text-ns-text'
                            }`}
              >
                <tab.Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
          <p className="text-ns-muted font-body text-sm mb-3">Could not load collections.</p>
          <button
            onClick={() => fetchTab(activeConfig)}
            className="text-ns-gold text-sm font-body hover:text-amber-400 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : collections.length === 0 ? (
        <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
          <CollectionsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
          <p className="text-ns-muted font-body text-sm">
            {activeTab === 'following'
              ? 'Follow creators to see their collections here.'
              : 'No collections yet. Be the first to create one!'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {collections.map((col, i) => (
            <EnrichedCollectionCard
              key={col.id}
              collection={col}
              rank={activeTab === 'trending' ? i + 1 : undefined}
              showVotes
            />
          ))}
        </div>
      )}
    </div>
  )
}
