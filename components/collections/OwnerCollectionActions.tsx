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
import Button from '@/components/ui/Button'
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
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setShowEdit(true)}>
          Edit Collection
        </Button>
        <Button variant="outline" href={`/collections/${collectionId}/analytics`}>
          Analytics
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          Delete
        </Button>
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
