'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'

// Lazy-load the heavy modal — it's not needed until the user clicks
const CollectionPickerModal = dynamic(() => import('./CollectionPickerModal'), { ssr: false })

interface Movie {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
}

interface Props {
  movie:    Movie
  compact?: boolean   // icon-only button for tight spaces (cards, grids)
}

const CollectionIcon = ({ size }: { size: number }) => (
  <svg
    width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
    viewBox="0 0 24 24"
    className="text-ns-muted group-hover:text-ns-gold transition-colors flex-shrink-0"
  >
    <rect x="3" y="3" width="7" height="18" rx="1"/>
    <rect x="13" y="3" width="8" height="11" rx="1"/>
    <path d="M13 17h8M17 13v8"/>
  </svg>
)

export default function AddToCollectionButton({ movie, compact = false }: Props) {
  const { status } = useSession()
  const [open, setOpen] = useState(false)

  // Don't render for unauthenticated users
  if (status !== 'authenticated') return null

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          title="Add to Collection"
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-ns-border
                     text-ns-muted hover:border-ns-gold/40 hover:text-ns-gold
                     transition-all duration-200 group flex-shrink-0"
        >
          <CollectionIcon size={13} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ns-border
                     text-ns-muted text-sm font-body hover:border-ns-gold/40 hover:text-ns-gold
                     transition-all duration-200 group"
        >
          <CollectionIcon size={15} />
          Add to Collection
        </button>
      )}

      {open && (
        <CollectionPickerModal
          movie={movie}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
