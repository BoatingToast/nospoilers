'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-md rounded border border-ns-border border-t-2 border-t-ns-text bg-ns-surface p-6">
        <h2 className="mb-2 font-display text-2xl tracking-wide text-ns-text">DELETE COLLECTION</h2>
        <p className="mb-1 font-body text-sm text-ns-muted">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-ns-text">&ldquo;{collectionTitle}&rdquo;</span>?
        </p>
        <p className="mb-6 font-body text-xs text-ns-danger">
          This action cannot be undone. All movies in this collection will be removed.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={deleting} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handle} disabled={deleting} className="flex-1">
            {deleting ? 'Deleting…' : 'Delete Collection'}
          </Button>
        </div>
      </div>
    </div>
  )
}
