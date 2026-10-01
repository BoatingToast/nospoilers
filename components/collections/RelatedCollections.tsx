'use client'

import { useEffect, useState } from 'react'
import EnrichedCollectionCard from './EnrichedCollectionCard'
import Section from '@/components/ui/Section'
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
    <Section title="YOU MAY ALSO LIKE" className="mt-16">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-3 aspect-[2/3] rounded bg-ns-border" />
              <div className="mb-1.5 h-3 w-4/5 rounded bg-ns-border" />
              <div className="h-2.5 w-2/5 rounded bg-ns-border" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map(col => (
            <EnrichedCollectionCard key={col.id} collection={col} showVotes />
          ))}
        </div>
      )}
    </Section>
  )
}
