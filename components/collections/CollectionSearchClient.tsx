'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { posterGridClass, revealDelay } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'
import CollectionSearchBar from './CollectionSearchBar'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'

export default function CollectionSearchClient() {
  const searchParams = useSearchParams()
  const initialQ     = searchParams.get('q') ?? ''

  const [results, setResults] = useState<EnrichedCollectionData[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentQ, setCurrentQ] = useState(initialQ)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    setCurrentQ(q)
    try {
      const res  = await fetch(`/api/collections/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Search on mount if query param exists
  useEffect(() => { if (initialQ) doSearch(initialQ) }, [initialQ, doSearch])

  return (
    <div>
      <div className="mb-8">
        <CollectionSearchBar initialQuery={initialQ} autoFocus />
      </div>

      {searched && !loading && results.length > 0 && (
        <p aria-live="polite" className="mb-5 text-base text-ns-muted">
          {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{currentQ}&rdquo;
        </p>
      )}

      {loading && (
        <div role="status" aria-label="Searching collections" className={posterGridClass}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] rounded-xl" />
              <Skeleton className="mt-2.5 h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-3 w-2/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div key={currentQ} className={cn(posterGridClass, 'animate-fade-up')}>
          {results.map((col, i) => (
            <div key={col.id} className={i > 5 ? 'ns-reveal' : undefined} style={i > 5 ? revealDelay(i) : undefined}>
              <EnrichedCollectionCard collection={col} showVotes />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <EmptyState
          title="No collections found"
          description={<>No results for &ldquo;{currentQ}&rdquo;. Try a different title, creator username, or movie name.</>}
        />
      )}

      {!loading && !searched && (
        <EmptyState
          title="Find a collection"
          description="Search by collection title, creator, or a movie title in the collection."
        />
      )}
    </div>
  )
}
