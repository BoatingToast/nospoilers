'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

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
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={toggleVisibility}>
        {isPublic ? 'Make Private' : 'Make Public'}
      </Button>
      <Button variant="danger" onClick={handleDelete} disabled={deleting}>
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  )
}
