'use client'

import { useEffect, useState } from 'react'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'

interface Props {
  collectionId: string
}

export default function RelatedCollections({ collectionId }: Props) {
  const [items,   setItems]   = useState<EnrichedCollectionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/collections/${collectionId}/related`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [collectionId])

  if (!loading && items.length === 0) return null

  return (
    <section className="mt-16 pt-8 border-t border-ns-border">
      <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">Discover</p>
      <h2 className="font-display text-2xl tracking-wider text-ns-text mb-6">YOU MAY ALSO LIKE</h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-ns-border mb-3" />
              <div className="h-3 bg-ns-border rounded w-4/5 mb-1.5" />
              <div className="h-2.5 bg-ns-border rounded w-2/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map(col => (
            <EnrichedCollectionCard key={col.id} collection={col} showVotes />
          ))}
        </div>
      )}
    </section>
  )
}
