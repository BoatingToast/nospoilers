'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CollectionSearchBar from './CollectionSearchBar'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'

export default function CollectionSearchClient() {
  const router       = useRouter()
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

  // Update URL when searching
  function handleSearch(q: string) {
    router.push(`/collections/search?q=${encodeURIComponent(q)}`, { scroll: false })
    doSearch(q)
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-8">
        <form
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const q  = String(fd.get('q') ?? '').trim()
            if (q) handleSearch(q)
          }}
        >
          <CollectionSearchBar
            initialQuery={initialQ}
            autoFocus
          />
        </form>
      </div>

      {/* Results header */}
      {searched && !loading && (
        <div className="mb-5 flex items-center justify-between">
          <p className="text-ns-muted text-sm font-body">
            {results.length === 0
              ? `No results for "${currentQ}"`
              : `${results.length} result${results.length !== 1 ? 's' : ''} for "${currentQ}"`
            }
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-3 aspect-[2/3] rounded bg-ns-border" />
              <div className="mb-1.5 h-3 w-4/5 rounded bg-ns-border" />
              <div className="h-2.5 w-2/5 rounded bg-ns-border" />
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map(col => (
            <EnrichedCollectionCard key={col.id} collection={col} showVotes />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && searched && results.length === 0 && (
        <div className="border-t border-ns-border py-8">
          <p className="mb-1 font-body text-sm font-medium text-ns-text">No collections found</p>
          <p className="font-body text-sm text-ns-muted">
            Try a different title, creator username, or movie name.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <p className="border-t border-ns-border py-8 font-body text-sm text-ns-muted">
          Search by collection title, creator, or a movie title in the collection.
        </p>
      )}
    </div>
  )
}
