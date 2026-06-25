'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { LockIcon, CollectionsIcon } from '@/components/icons'

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
    return (
      <div className="py-20 text-center">
        <LockIcon size={40} className="text-ns-muted/40 mx-auto mb-3" />
        <p className="text-ns-muted font-body text-sm">This user's collections are private.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-ns-surface border border-ns-border rounded-2xl p-4 h-28" />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <div className="py-20 text-center">
        <CollectionsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
        <p className="text-ns-muted font-body text-sm">No public collections yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {collections.map(c => (
        <Link key={c.id} href={`/collections/${c.id}`} className="group bg-ns-surface border border-ns-border rounded-2xl p-4 hover:border-ns-gold/40 transition-colors">
          <div className="flex items-start gap-3">
            {/* Preview posters strip */}
            <div className="flex -space-x-3 flex-shrink-0">
              {c.previewPosters.slice(0, 3).map((poster, i) => (
                <div key={i} className="w-10 h-14 rounded-lg overflow-hidden border-2 border-ns-surface bg-ns-border" style={{ zIndex: 3 - i }}>
                  {poster && (
                    <Image
                      src={tmdbImageUrl(poster, 'w185')}
                      alt=""
                      width={40}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body text-white group-hover:text-ns-gold transition-colors line-clamp-1">{c.title}</p>
              {c.description && (
                <p className="text-xs font-body text-ns-muted line-clamp-2 mt-0.5">{c.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-body text-ns-muted">{c.movieCount} films</span>
                {c.upvotes > 0 && (
                  <span className="text-[10px] font-body text-ns-gold">▲ {c.upvotes}</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
