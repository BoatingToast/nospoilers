'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { revealDelay } from '@/components/watchlist/LibraryControls'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import type { EnrichedCollectionData } from '@/types'

interface Props {
  collectionId: string
}

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'

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
    <section className="mt-16 lg:mt-20">
      <h2 className="mb-6 font-display text-3xl text-ns-text">You may also like</h2>

      {loading ? (
        <div role="status" aria-label="Loading related collections" className={gridClass}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] rounded-xl" />
              <Skeleton className="mt-2.5 h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-3 w-2/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className={gridClass}>
          {items.map((col, i) => (
            <div key={col.id} className="ns-reveal" style={revealDelay(i)}>
              <EnrichedCollectionCard collection={col} showVotes />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
