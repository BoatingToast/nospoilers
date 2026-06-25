'use client'

/**
 * OwnerCollectionActions — buttons shown only to the collection owner.
 * Renders: [Edit Collection] [Analytics] [Delete]
 * Edit opens EditCollectionModal.
 * Delete opens DeleteCollectionModal (custom — no browser confirm()).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { CollectionMovieData } from '@/types'

const EditCollectionModal   = dynamic(() => import('./EditCollectionModal'),   { ssr: false })
const DeleteCollectionModal = dynamic(() => import('./DeleteCollectionModal'), { ssr: false })

interface Props {
  collectionId:  string
  title:         string
  description:   string | null
  isPublic:      boolean
  movies:        CollectionMovieData[]
}

export default function OwnerCollectionActions({
  collectionId,
  title,
  description,
  isPublic,
  movies,
}: Props) {
  const router = useRouter()
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  async function handleDelete() {
    await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' })
    router.push('/collections')
  }

  // Refresh the underlying page once when the modal is closed — not after
  // every individual mutation inside it.  Calling router.refresh() on every
  // add/remove/reorder triggers Next.js to re-render server components and
  // pass new props down into the still-open modal, which fights the modal's
  // own optimistic state and makes "+ Add" look like it does nothing.
  function handleClose() {
    setShowEdit(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Edit */}
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ns-border
                     text-ns-muted text-xs font-body hover:border-ns-gold/40 hover:text-ns-gold transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Collection
        </button>

        {/* Analytics */}
        <a
          href={`/collections/${collectionId}/analytics`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ns-border
                     text-ns-muted text-xs font-body hover:border-ns-gold/40 hover:text-ns-gold transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 3v18h18"/><path d="M7 12l4-4 4 4 4-4"/>
          </svg>
          Analytics
        </a>

        {/* Delete */}
        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30
                     text-red-400 text-xs font-body hover:bg-red-500/10 transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          Delete
        </button>
      </div>

      {showEdit && (
        <EditCollectionModal
          collectionId={collectionId}
          initialTitle={title}
          initialDescription={description}
          initialIsPublic={isPublic}
          initialMovies={movies}
          onClose={handleClose}
        />
      )}

      {showDelete && (
        <DeleteCollectionModal
          collectionTitle={title}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
