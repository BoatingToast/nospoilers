'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  collectionId: string
  isPublic:     boolean
}

export default function CollectionActions({ collectionId, isPublic }: Props) {
  const router  = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function toggleVisibility() {
    await fetch(`/api/collections/${collectionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isPublic: !isPublic }),
    })
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this collection? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' })
    router.push('/collections')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleVisibility}
        className="px-3 py-1.5 rounded-xl border border-ns-border text-ns-muted text-xs font-body hover:border-ns-muted/40 hover:text-ns-text transition-colors"
      >
        {isPublic ? 'Make Private' : 'Make Public'}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-body hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
