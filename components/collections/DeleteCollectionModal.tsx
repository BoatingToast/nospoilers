'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface Props {
  collectionTitle: string
  onConfirm: () => Promise<void>
  onCancel:  () => void
}

export default function DeleteCollectionModal({ collectionTitle, onConfirm, onCancel }: Props) {
  const [deleting, setDeleting] = useState(false)

  async function handle() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      onClose={() => { if (!deleting) onCancel() }}
      ariaLabelledBy="delete-collection-title"
      ariaDescribedBy="delete-collection-description"
      showClose={!deleting}
    >
      <div className="p-6 sm:p-7">
        <h2 id="delete-collection-title" className="pr-10 font-display text-2xl text-ns-text">Delete collection</h2>
        <div id="delete-collection-description" className="mt-3 text-base leading-relaxed text-ns-muted">
          <p>
            Are you sure you want to delete{' '}
            <span className="break-words font-semibold text-ns-text">&ldquo;{collectionTitle}&rdquo;</span>?
          </p>
          <p className="mt-2 text-sm text-ns-danger">
            This action cannot be undone. All movies in this collection will be removed.
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={handle} loading={deleting}>
            {deleting ? 'Deleting…' : 'Delete Collection'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
