'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
        <label className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 block">Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Mind-Bending Thrillers"
          maxLength={60}
          className="w-full bg-ns-surface border border-ns-border rounded-xl px-4 py-3 text-ns-text font-body text-sm
                     placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40 transition-colors"
        />
      </div>

      <div>
        <label className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 block">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What's this collection about?"
          rows={3}
          maxLength={300}
          className="w-full bg-ns-surface border border-ns-border rounded-xl px-4 py-3 text-ns-text font-body text-sm
                     placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40 transition-colors resize-none"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-ns-surface border border-ns-border rounded-xl">
        <div>
          <p className="text-ns-text text-sm font-body font-medium">Public collection</p>
          <p className="text-ns-muted text-xs font-body">Anyone can discover and view this collection</p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className={`w-11 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-ns-gold' : 'bg-ns-border'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {error && <p className="text-red-400 text-sm font-body">{error}</p>}

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="w-full py-3 bg-ns-gold text-ns-bg rounded-xl font-body font-medium text-sm hover:bg-ns-gold/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Collection'}
      </button>
    </form>
  )
}
