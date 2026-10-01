'use client'

import { useState, useEffect, useCallback } from 'react'
import RecommendationCard from './RecommendationCard'
import { RecommendationCardSkeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
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
    <Section
      title="RECOMMENDED FOR YOU"
      note="Based on your Movie DNA"
      action={
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={refreshing} className="min-h-10">
          Refresh
        </Button>
      }
    >
      {error && (
        <p className="mb-4 font-body text-sm text-ns-danger">{error}</p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <RecommendationCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="border-t border-ns-border py-6 font-body text-sm text-ns-muted">No recommendations yet. Add your TMDb API key to get started.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
          </div>

          {hasMore && (
            <div className="mt-6">
              <Button variant="secondary" size="md" onClick={handleLoadMore} loading={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}
