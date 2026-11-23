'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { CollectionsIcon } from '@/components/icons'

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

export default function AddToCollectionButton({ movie, compact = false }: Props) {
  const { status } = useSession()
  const [open, setOpen] = useState(false)

  // Don't render for unauthenticated users
  if (status !== 'authenticated') return null

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Add to Collection"
          aria-label={`Add ${movie.title} to a collection`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-2 text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
        >
          <CollectionsIcon size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-ns-surface-2 px-5 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
        >
          <CollectionsIcon size={16} />
          Add to Collection
        </button>
      )}

      {/* Portaled so the dialog is never trapped by an animated card. */}
      {open && createPortal(
        <CollectionPickerModal
          movie={movie}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </>
  )
}
