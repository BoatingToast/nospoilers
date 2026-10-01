'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
  { key: 'trending',     label: 'Trending', api: '/api/collections/trending' },
  { key: 'popular',     label: 'Popular', api: '/api/collections?tab=popular' },
  { key: 'newest',      label: 'Newest', api: '/api/collections?tab=newest' },
  { key: 'most_upvoted', label: 'Most Upvoted', api: '/api/collections?tab=most_upvoted' },
  { key: 'most_movies', label: 'Most Movies', api: '/api/collections?tab=most_movies' },
  { key: 'following',   label: 'Following', api: '/api/collections?tab=following', authRequired: true },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded bg-ns-border mb-3" />
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
      <div className="mb-8 flex flex-wrap gap-x-5 border-b border-ns-border">
        {TABS.map(tab => {
          if (tab.authRequired && status !== 'authenticated') return null
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`-mb-px min-h-10 whitespace-nowrap border-b-2 font-heading text-sm transition-colors
                          ${isActive
                            ? 'border-ns-text text-ns-text'
                            : 'border-transparent text-ns-muted hover:text-ns-text'
                          }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="py-8">
          <p className="mb-3 font-body text-sm text-ns-muted">Could not load collections.</p>
          <button
            onClick={() => fetchTab(activeConfig)}
            className="min-h-10 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
          >
            Try again
          </button>
        </div>
      ) : collections.length === 0 ? (
        <p className="py-8 font-body text-sm text-ns-muted">
          {activeTab === 'following'
            ? 'Follow creators to see their collections here.'
            : 'No collections yet. Be the first to create one!'
          }
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
