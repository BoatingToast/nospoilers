'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

interface CollectionItem {
  id:             string
  title:          string
  description:    string | null
  coverPath:      string | null
  movieCount:     number
  upvotes:        number
  updatedAt:      string
  previewPosters: (string | null)[]
}

export default function ProfileCollectionsTab({ username }: { username: string }) {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [blocked,     setBlocked]     = useState(false)

  useEffect(() => {
    fetch(`/api/profile/${username}/tabs?tab=collections`)
      .then(r => {
        if (r.status === 403) { setBlocked(true); return null }
        return r.json()
      })
      .then(data => { if (data) setCollections(data.collections ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  if (blocked) {
    return <EmptyState title="This user's collections are private." />
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-ns-surface" />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return <EmptyState title="No public collections yet." />
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {collections.map((c, index) => (
        <div key={c.id} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
          <Link
            href={`/collections/${c.id}`}
            className="group flex h-full items-center gap-5 rounded-2xl bg-ns-surface p-5 transition-colors duration-150 hover:bg-ns-surface-2"
          >
            <div className="flex flex-shrink-0 -space-x-6">
              {c.previewPosters.slice(0, 3).map((poster, i) => (
                <div
                  key={i}
                  className="relative aspect-[2/3] w-14 overflow-hidden rounded-lg bg-ns-surface-3 ring-2 ring-ns-surface transition-colors duration-150 group-hover:ring-ns-surface-2 sm:w-16"
                  style={{ zIndex: 3 - i }}
                >
                  {poster && (
                    <Image
                      src={tmdbImageUrl(poster, 'w185')}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-bold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">{c.title}</p>
              {c.description && (
                <p className="mt-0.5 line-clamp-2 text-sm text-ns-muted">{c.description}</p>
              )}
              <p className="mt-2 text-sm tabular-nums text-ns-subtle">
                {c.movieCount} films
                {c.upvotes > 0 && <span> · ▲ {c.upvotes}</span>}
              </p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}
