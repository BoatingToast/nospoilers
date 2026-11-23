'use client'

import { useState, useEffect, useCallback } from 'react'
import RecommendationCard from './RecommendationCard'
import { RecommendationCardSkeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import type { RecommendationItem } from '@/types'

export default function RecommendationFeed() {
  const [items,    setItems]    = useState<RecommendationItem[]>([])
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [loadMore, setLoadMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,    setError]    = useState('')

  const fetchPage = useCallback(async (p: number, replace = false) => {
    try {
      const res  = await fetch(`/api/recommendations?page=${p}&limit=10`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setItems(prev => replace ? data.items : [...prev, ...data.items])
      setHasMore(data.hasMore)
      setPage(p)
    } catch {
      setError('Could not load recommendations.')
    }
  }, [])

  useEffect(() => {
    fetchPage(1, true).finally(() => setLoading(false))
  }, [fetchPage])

  async function handleLoadMore() {
    setLoadMore(true)
    await fetchPage(page + 1)
    setLoadMore(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError('')
    try {
      await fetch('/api/recommendations/refresh', { method: 'POST' })
      await fetchPage(1, true)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section aria-labelledby="recommended-for-you">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="recommended-for-you" className="font-display text-3xl text-ns-text sm:text-4xl">Recommended for you</h2>
          <p className="mt-1.5 text-base text-ns-muted">Based on your Movie DNA</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing} className="flex-shrink-0">
          Refresh
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-ns-danger">{error}</p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <RecommendationCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Add your TMDb API key to get started."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="secondary" size="md" onClick={handleLoadMore} loading={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
