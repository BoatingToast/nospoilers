'use client'

import { useState } from 'react'

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md bg-ns-surface border border-ns-border rounded-2xl shadow-2xl p-6">
        <h2 className="font-display text-xl tracking-wider text-ns-text mb-2">DELETE COLLECTION</h2>
        <p className="text-ns-muted font-body text-sm mb-1">
          Are you sure you want to delete{' '}
          <span className="text-ns-text font-semibold">&ldquo;{collectionTitle}&rdquo;</span>?
        </p>
        <p className="text-red-400/80 font-body text-xs mb-6">
          This action cannot be undone. All movies in this collection will be removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-ns-border text-ns-muted text-sm
                       font-body hover:border-ns-muted/60 hover:text-ns-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400
                       text-sm font-body hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Collection'}
          </button>
        </div>
      </div>
    </div>
  )
}
