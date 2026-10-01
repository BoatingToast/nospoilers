'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function CreateCollectionForm() {
  const router = useRouter()
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [isPublic,    setIsPublic]    = useState(true)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/collections', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), description: description.trim() || null, isPublic }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
      router.push(`/collections/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block font-heading text-sm text-ns-text">Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Mind-Bending Thrillers"
          maxLength={60}
          className="w-full rounded border border-ns-border bg-ns-surface px-4 py-3 font-body text-sm text-ns-text
                     placeholder:text-ns-muted/40 focus:border-ns-text focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="mb-2 block font-heading text-sm text-ns-text">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What's this collection about?"
          rows={3}
          maxLength={300}
          className="w-full resize-none rounded border border-ns-border bg-ns-surface px-4 py-3 font-body text-sm text-ns-text
                     placeholder:text-ns-muted/40 focus:border-ns-text focus:outline-none transition-colors"
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-y border-ns-border py-4">
        <div className="min-w-0">
          <p className="font-body text-sm font-medium text-ns-text">Public collection</p>
          <p className="font-body text-xs text-ns-muted">Anyone can discover and view this collection</p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${isPublic ? 'bg-ns-secondary' : 'bg-ns-border'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {error && <p className="font-body text-sm text-ns-danger">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={loading || !title.trim()}
        className="w-full sm:w-auto sm:self-start"
      >
        {loading ? 'Creating...' : 'Create Collection'}
      </Button>
    </form>
  )
}
