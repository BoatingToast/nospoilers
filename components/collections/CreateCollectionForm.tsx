'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn } from '@/lib/utils'

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-3xl bg-ns-surface p-6 sm:p-10">
      <Input
        id="collection-title"
        label="Title *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Mind-Bending Thrillers"
        maxLength={60}
        error={error || undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-description" className="text-sm font-semibold text-ns-text">Description</label>
        <textarea
          id="collection-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What's this collection about?"
          rows={3}
          maxLength={300}
          className="w-full resize-none rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
        />
        <p className="text-right text-xs tabular-nums text-ns-muted">{description.length}/300</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p id="collection-public-label" className="text-base font-semibold text-ns-text">Public collection</p>
          <p className="text-sm text-ns-muted">Anyone can discover and view this collection</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-labelledby="collection-public-label"
          onClick={() => setIsPublic(!isPublic)}
          className="flex h-11 flex-shrink-0 items-center"
        >
          <span className={cn('relative block h-7 w-12 rounded-full transition-colors duration-200', isPublic ? 'bg-ns-secondary' : 'bg-ns-surface-3')}>
            <span className={cn(
              'absolute left-1 top-1 h-5 w-5 rounded-full bg-ns-text transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
              isPublic && 'translate-x-5',
            )} />
          </span>
        </button>
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={!title.trim()} className="w-full">
        {loading ? 'Creating…' : 'Create Collection'}
      </Button>
    </form>
  )
}
