'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PillTabs, posterGridClass, revealDelay } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'trending' | 'popular' | 'newest' | 'most_upvoted' | 'most_movies' | 'following'

interface TabConfig {
  key:           TabKey
  label:         string
  api:           string
  authRequired?: boolean
}

const TABS: TabConfig[] = [
  { key: 'trending', label: 'Trending', api: '/api/collections/trending' },
  { key: 'popular', label: 'Popular', api: '/api/collections?tab=popular' },
  { key: 'newest', label: 'Newest', api: '/api/collections?tab=newest' },
  { key: 'most_upvoted', label: 'Most upvoted', api: '/api/collections?tab=most_upvoted' },
  { key: 'most_movies', label: 'Most movies', api: '/api/collections?tab=most_movies' },
  { key: 'following', label: 'Following', api: '/api/collections?tab=following', authRequired: true },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading collections" className={posterGridClass}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <Skeleton className="mt-2.5 h-4 w-4/5" />
          <Skeleton className="mt-1.5 h-3 w-2/5" />
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

  const tabOptions = TABS
    .filter(tab => !tab.authRequired || status === 'authenticated')
    .map(tab => ({ value: tab.key, label: tab.label }))

  return (
    <div>
      <PillTabs label="Browse collections" options={tabOptions} value={activeTab} onChange={switchTab} className="mb-8" />

      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <EmptyState
          title="Could not load collections."
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => fetchTab(activeConfig)}>Try again</Button>}
        />
      ) : collections.length === 0 ? (
        <EmptyState
          title={activeTab === 'following' ? 'Nothing from creators you follow' : 'No collections yet'}
          description={activeTab === 'following'
            ? 'Follow creators to see their collections here.'
            : 'No collections yet. Be the first to create one!'}
        />
      ) : (
        <div key={activeTab} className={cn(posterGridClass, 'animate-fade-up')}>
          {collections.map((col, i) => (
            <div key={col.id} className={i > 5 ? 'ns-reveal' : undefined} style={i > 5 ? revealDelay(i) : undefined}>
              <EnrichedCollectionCard
                collection={col}
                rank={activeTab === 'trending' ? i + 1 : undefined}
                showVotes
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
