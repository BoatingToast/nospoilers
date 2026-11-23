'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn, tmdbImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CollectionData } from '@/types'
import { CheckIcon, CollectionsIcon, PlusIcon, WarningIcon } from '@/components/icons'

interface Movie {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
}

interface Props {
  movie:   Movie
  onClose: () => void
}

export default function CollectionPickerModal({ movie, onClose }: Props) {
  const router = useRouter()

  const [collections, setCollections] = useState<CollectionData[]>([])
  const [loading,     setLoading]     = useState(true)
  const [toggling,    setToggling]    = useState<string | null>(null)
  const [added,       setAdded]       = useState<Set<string>>(new Set())
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  // Inline create state
  const [showCreate,  setShowCreate]  = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [creating,    setCreating]    = useState(false)
  const [createError, setCreateError] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  // ── Fetch user's collections ──────────────────────────────────────────────

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/collections?mine=true')
      const data: CollectionData[] = await res.json()
      setCollections(data)

      // Mark which collections already contain this movie
      const alreadyIn = new Set<string>()
      for (const col of data) {
        if (col.movies?.some(m => m.tmdbId === movie.tmdbId)) {
          alreadyIn.add(col.id)
        }
      }
      setAdded(alreadyIn)
    } finally {
      setLoading(false)
    }
  }, [movie.tmdbId])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  // ── Focus title input when create row appears ─────────────────────────────

  useEffect(() => {
    if (showCreate) setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [showCreate])

  // ── Toggle movie in/out of a collection ───────────────────────────────────

  async function toggle(collectionId: string) {
    if (toggling) return
    setToggling(collectionId)

    const isIn = added.has(collectionId)

    // Optimistic update
    setAdded(prev => {
      const next = new Set(prev)
      isIn ? next.delete(collectionId) : next.add(collectionId)
      return next
    })

    try {
      let res: Response
      if (isIn) {
        res = await fetch(
          `/api/collections/${collectionId}/movies?tmdbId=${movie.tmdbId}`,
          { method: 'DELETE' },
        )
      } else {
        res = await fetch(`/api/collections/${collectionId}/movies`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            tmdbId:      movie.tmdbId,
            title:       movie.title,
            posterPath:  movie.posterPath,
            releaseDate: movie.releaseDate,
          }),
        })
      }

      if (res.ok) {
        const colTitle = collections.find(c => c.id === collectionId)?.title ?? 'Collection'
        showToast(isIn ? `Removed from "${colTitle}"` : `Added to "${colTitle}"`)
        router.refresh()
      } else {
        throw new Error('Request failed')
      }
    } catch {
      // Revert optimistic update on failure
      setAdded(prev => {
        const next = new Set(prev)
        isIn ? next.add(collectionId) : next.delete(collectionId)
        return next
      })
      showToast('Something went wrong. Please try again.', false)
    } finally {
      setToggling(null)
    }
  }

  // ── Create new collection + auto-add movie ────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setCreateError('')

    try {
      // 1. Create collection
      const createRes = await fetch('/api/collections', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: newTitle.trim(), isPublic: true }),
      })
      if (!createRes.ok) {
        const err = await createRes.json()
        setCreateError(err.error ?? 'Failed to create collection')
        return
      }
      const newCol: CollectionData = await createRes.json()

      // 2. Add movie to new collection
      await fetch(`/api/collections/${newCol.id}/movies`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tmdbId:      movie.tmdbId,
          title:       movie.title,
          posterPath:  movie.posterPath,
          releaseDate: movie.releaseDate,
        }),
      })

      // 3. Update local state
      const enriched = { ...newCol, movieCount: 1, movies: [] }
      setCollections(prev => [enriched, ...prev])
      setAdded(prev => new Set([...prev, newCol.id]))
      setNewTitle('')
      setShowCreate(false)
      showToast(`"${newCol.title}" created & movie added!`)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal onClose={onClose} ariaLabelledBy="collection-picker-title" maxWidth="max-w-md">
      <div className="px-6 pb-4 pr-16 pt-6">
        <h2 id="collection-picker-title" className="font-display text-2xl text-ns-text">Add to collection</h2>
        <p className="mt-1 truncate text-sm text-ns-muted">{movie.title}</p>
      </div>

      <div role="status" className="px-6 empty:hidden">
        {toast && (
          <p className={cn(
            'mb-3 flex animate-fade-up items-center gap-2 rounded-xl px-3 py-2 text-sm',
            toast.ok ? 'bg-ns-success/10 text-ns-success' : 'bg-ns-danger/10 text-ns-danger',
          )}>
            {toast.ok ? <CheckIcon size={15} strokeWidth={2.5} className="flex-shrink-0" /> : <WarningIcon size={15} className="flex-shrink-0" />}
            <span className="min-w-0 truncate">{toast.msg}</span>
          </p>
        )}
      </div>

      <div className="max-h-[50dvh] overflow-y-auto px-3">
        {loading && (
          <div role="status" aria-label="Loading your collections" className="space-y-1 px-3 pb-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[4.5rem] rounded-xl bg-ns-surface-2" />
            ))}
          </div>
        )}

        {!loading && collections.length === 0 && !showCreate && (
          <div className="px-3 py-10 text-center">
            <p className="font-heading text-lg font-bold text-ns-text">You don&apos;t have any collections yet.</p>
            <p className="mt-1 text-sm text-ns-muted">Create one below to get started.</p>
          </div>
        )}

        {!loading && collections.length > 0 && (
          <ul className="space-y-0.5">
            {collections.map(col => {
              const isIn   = added.has(col.id)
              const isBusy = toggling === col.id
              const cover  = col.coverPath

              return (
                <li key={col.id}>
                  <button
                    type="button"
                    onClick={() => toggle(col.id)}
                    disabled={isBusy}
                    aria-pressed={isIn}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors duration-150 hover:bg-ns-surface-2 disabled:cursor-wait"
                  >
                    <div className="relative aspect-[2/3] w-10 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-3">
                      {cover ? (
                        <Image src={tmdbImageUrl(cover, 'w185')} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <CollectionsIcon size={16} className="text-ns-subtle" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ns-text">{col.title}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-ns-muted">
                        {col.movieCount} film{col.movieCount !== 1 ? 's' : ''}
                        {!col.isPublic && ' · Private'}
                      </p>
                    </div>

                    <span className={cn(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                      isIn ? 'bg-ns-accent text-ns-secondary-foreground' : 'border border-ns-border-strong text-transparent',
                    )}>
                      {isBusy
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-ns-muted" />
                        : <CheckIcon size={14} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="animate-fade-up px-3 py-4">
            <label htmlFor="picker-new-title" className="text-sm font-semibold text-ns-text">New collection</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="picker-new-title"
                ref={titleInputRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Collection name..."
                maxLength={60}
                aria-invalid={createError ? true : undefined}
                aria-describedby={createError ? 'picker-new-title-error' : undefined}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-2 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
              />
              <Button type="submit" loading={creating} disabled={!newTitle.trim()} className="flex-shrink-0">
                {creating ? 'Creating…' : 'Create & Add'}
              </Button>
            </div>
            {createError && <p id="picker-new-title-error" className="mt-2 text-sm text-ns-danger">{createError}</p>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowCreate(false); setNewTitle(''); setCreateError('') }}
              className="-ml-3 mt-2 text-ns-muted hover:bg-ns-surface-2"
            >
              Cancel
            </Button>
          </form>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-ns-border px-4 py-3">
        {!showCreate ? (
          <Button variant="ghost" onClick={() => setShowCreate(true)} className="hover:bg-ns-surface-2">
            <PlusIcon size={16} />
            New collection
          </Button>
        ) : <span />}
        <Button variant="outline" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
