'use client'

import { useState, useEffect, useCallback } from 'react'
import RecommendationCard from './RecommendationCard'
import { RecommendationCardSkeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl tracking-wider text-ns-text">RECOMMENDED FOR YOU</h2>
          <p className="text-ns-muted text-xs font-body mt-1">Based on your Movie DNA</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing}>
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-red-400 text-sm font-body mb-4">{error}</p>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <RecommendationCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-ns-border rounded-2xl p-10 text-center">
          <p className="text-ns-muted font-body text-sm">No recommendations yet. Add your TMDb API key to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
          </div>

          {hasMore && (
            <div className="text-center mt-6">
              <Button variant="secondary" size="md" onClick={handleLoadMore} loading={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
