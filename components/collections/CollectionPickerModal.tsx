'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { tmdbImageUrl } from '@/lib/utils'
import type { CollectionData } from '@/types'
import { CollectionsIcon } from '@/components/icons'

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

  const backdropRef   = useRef<HTMLDivElement>(null)
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

  // ── ESC to close ──────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    /* Backdrop */
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-ns-bg border border-ns-border rounded-2xl overflow-hidden shadow-2xl">

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 px-5 py-2.5 text-xs font-body transition-all ${
            toast.ok
              ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-b border-red-500/20'
          }`}>
            {toast.ok
              ? <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            }
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
          <div>
            <h2 className="font-display text-xl tracking-wider text-ns-text">ADD TO COLLECTION</h2>
            <p className="text-ns-muted text-xs font-body mt-0.5 truncate max-w-[260px]">{movie.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-ns-muted hover:text-ns-text hover:bg-ns-surface transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-ns-gold/30 border-t-ns-gold rounded-full animate-spin" />
            </div>
          )}

          {/* No collections yet */}
          {!loading && collections.length === 0 && !showCreate && (
            <div className="py-12 text-center px-5">
              <CollectionsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
              <p className="text-ns-muted font-body text-sm">You don&apos;t have any collections yet.</p>
              <p className="text-ns-muted/60 font-body text-xs mt-1">Create one below to get started.</p>
            </div>
          )}

          {/* Collection list */}
          {!loading && collections.length > 0 && (
            <ul className="divide-y divide-ns-border/40">
              {collections.map(col => {
                const isIn      = added.has(col.id)
                const isBusy    = toggling === col.id
                const cover     = col.coverPath
                const count     = isIn
                  ? (col.movieCount + (isIn && !col.movies?.some(m => m.tmdbId === movie.tmdbId) ? 1 : 0))
                  : col.movieCount

                return (
                  <li key={col.id}>
                    <button
                      onClick={() => toggle(col.id)}
                      disabled={isBusy}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ns-surface/60 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-14 rounded-lg overflow-hidden bg-ns-surface border border-ns-border flex-shrink-0">
                        {cover ? (
                          <Image
                            src={tmdbImageUrl(cover, 'w185')}
                            alt={col.title}
                            width={40} height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CollectionsIcon size={18} className="text-ns-muted/40" />
                          </div>
                        )}
                      </div>

                      {/* Title + count */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-ns-text text-sm font-body font-medium truncate group-hover:text-ns-gold transition-colors">
                          {col.title}
                        </p>
                        <p className="text-ns-muted text-xs font-body mt-0.5">
                          {col.movieCount} film{col.movieCount !== 1 ? 's' : ''}
                          {!col.isPublic && <span className="ml-2 opacity-60">· Private</span>}
                        </p>
                      </div>

                      {/* Check indicator */}
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border transition-all ${
                        isIn
                          ? 'bg-ns-gold border-ns-gold text-ns-bg'
                          : 'border-ns-border text-transparent group-hover:border-ns-muted/40'
                      }`}>
                        {isBusy ? (
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Inline create form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="px-5 py-4 border-t border-ns-border/40 bg-ns-surface/30">
              <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-3">New Collection</p>
              <div className="flex gap-2">
                <input
                  ref={titleInputRef}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Collection name..."
                  maxLength={60}
                  className="flex-1 bg-ns-surface border border-ns-border rounded-xl px-3 py-2 text-ns-text font-body text-sm
                             placeholder:text-ns-muted/40 focus:outline-none focus:border-ns-gold/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 bg-ns-gold text-ns-bg rounded-xl font-body font-medium text-sm
                             hover:bg-ns-gold/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {creating ? 'Creating...' : 'Create & Add'}
                </button>
              </div>
              {createError && <p className="text-red-400 text-xs font-body mt-2">{createError}</p>}
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewTitle(''); setCreateError('') }}
                className="text-ns-muted text-xs font-body mt-2 hover:text-ns-text transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ns-border flex items-center justify-between">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-ns-gold text-sm font-body hover:text-amber-400 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Collection
            </button>
          ) : (
            <span />
          )}

          <button
            onClick={onClose}
            className="text-ns-muted text-sm font-body hover:text-ns-text transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
