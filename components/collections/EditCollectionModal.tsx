'use client'

/**
 * EditCollectionModal
 *
 * Tabs: Details | Movies | Add Movies
 *
 * Details tab  — title, description, visibility toggle
 * Movies tab   — current movies with remove button + drag handles for reorder
 * Add Movies   — TMDB search, click to add
 *
 * Design decisions:
 * - All mutations (add/remove/reorder) persist immediately to the DB via API.
 * - Local state is updated optimistically — no page-level router.refresh() is
 *   called while the modal is open.  The parent calls router.refresh() once
 *   when the modal closes, avoiding a race between Next.js prop updates and
 *   the modal's own optimistic state (which previously made "+ Add" look like
 *   it did nothing).
 * - Add is fully optimistic: state updates before the fetch so the UI reacts
 *   instantly; the optimistic update is reverted + an error message is shown
 *   if the API call fails.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { cn, tmdbImageUrl, formatYear } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { CheckIcon, ChevronIcon, CloseIcon, PlusIcon } from '@/components/icons'
import { PillTabs } from '@/components/watchlist/LibraryControls'
import type { CollectionMovieData } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TMDBResult {
  id:           number
  title:        string
  poster_path:  string | null
  release_date: string | null
}

interface Props {
  collectionId:       string
  initialTitle:       string
  initialDescription: string | null
  initialIsPublic:    boolean
  initialMovies:      CollectionMovieData[]
  onClose:            () => void
}

type Tab = 'details' | 'movies' | 'add'

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditCollectionModal({
  collectionId,
  initialTitle,
  initialDescription,
  initialIsPublic,
  initialMovies,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('details')

  // Details state
  const [title,       setTitle]       = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [isPublic,    setIsPublic]    = useState(initialIsPublic)
  const [saving,      setSaving]      = useState(false)
  const [detailsErr,  setDetailsErr]  = useState('')

  // Movies state — managed locally; persisted to DB per-operation
  const [movies,     setMovies]     = useState<CollectionMovieData[]>([...initialMovies])
  const [reordering, setReordering] = useState(false)

  // Drag refs
  const dragIdx  = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  // TMDB search state
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId,  setAddingId]  = useState<number | null>(null)
  const [addError,  setAddError]  = useState('')

  // addedIds tracks which movies are already in the collection so the Add
  // button correctly disables/enables without relying on prop updates.
  const [addedIds, setAddedIds] = useState<Set<number>>(
    () => new Set(initialMovies.map(m => m.tmdbId))
  )

  // ── Details save ──────────────────────────────────────────────────────────

  async function saveDetails() {
    if (!title.trim()) { setDetailsErr('Title is required'); return }
    setSaving(true)
    setDetailsErr('')
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), description: description.trim() || null, isPublic }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch {
      setDetailsErr('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Remove movie ──────────────────────────────────────────────────────────

  async function removeMovie(tmdbId: number) {
    // Optimistic remove
    setMovies(prev => prev.filter(m => m.tmdbId !== tmdbId))
    setAddedIds(prev => { const s = new Set(prev); s.delete(tmdbId); return s })

    const res = await fetch(
      `/api/collections/${collectionId}/movies?tmdbId=${tmdbId}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      // Revert — re-add the movie to the list (order is approximate but avoids
      // desync more gracefully than leaving a ghost gap)
      const reverted = initialMovies.find(m => m.tmdbId === tmdbId)
      if (reverted) {
        setMovies(prev => [...prev, reverted])
        setAddedIds(prev => new Set([...prev, tmdbId]))
      }
    }
  }

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────

  function onDragStart(idx: number) {
    dragIdx.current = idx
  }

  function onDragEnter(idx: number) {
    dragOver.current = idx
    setMovies(prev => {
      const arr  = [...prev]
      const item = arr.splice(dragIdx.current!, 1)[0]
      arr.splice(idx, 0, item)
      dragIdx.current = idx
      return arr
    })
  }

  async function onDragEnd() {
    const snapshot = [...movies]  // capture current order before async
    dragIdx.current  = null
    dragOver.current = null
    setReordering(true)
    try {
      await fetch(`/api/collections/${collectionId}/movies`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          positions: snapshot.map((m, i) => ({ tmdbId: m.tmdbId, position: i })),
        }),
      })
    } finally {
      setReordering(false)
    }
  }

  async function moveMovie(idx: number, delta: -1 | 1) {
    const target = idx + delta
    if (target < 0 || target >= movies.length) return
    const next = [...movies]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    setMovies(next)
    setReordering(true)
    try {
      await fetch(`/api/collections/${collectionId}/movies`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          positions: next.map((m, i) => ({ tmdbId: m.tmdbId, position: i })),
        }),
      })
    } finally {
      setReordering(false)
    }
  }

  // ── TMDB search ───────────────────────────────────────────────────────────

  const searchTMDB = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      // /api/search returns { movies: TMDbMovie[], people: TMDbPerson[] }
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.movies ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchTMDB(query), 300)
    return () => clearTimeout(timer)
  }, [query, searchTMDB])

  // ── Add movie — fully optimistic ──────────────────────────────────────────

  async function addMovie(movie: TMDBResult) {
    if (addedIds.has(movie.id)) return
    setAddError('')

    // 1. Optimistically update local state first — UI responds instantly
    const optimisticEntry: CollectionMovieData = {
      id:          String(movie.id),
      tmdbId:      movie.id,
      title:       movie.title,
      posterPath:  movie.poster_path,
      releaseDate: movie.release_date,
      addedAt:     new Date().toISOString(),
      position:    movies.length,
    }
    setMovies(prev => [...prev, optimisticEntry])
    setAddedIds(prev => new Set([...prev, movie.id]))
    setAddingId(movie.id)

    // 2. Persist to the server
    try {
      const res = await fetch(`/api/collections/${collectionId}/movies`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tmdbId:      movie.id,
          title:       movie.title,
          posterPath:  movie.poster_path,
          releaseDate: movie.release_date,
        }),
      })

      if (!res.ok) {
        // 3. Revert on failure and surface the error
        setMovies(prev => prev.filter(m => m.tmdbId !== movie.id))
        setAddedIds(prev => { const s = new Set(prev); s.delete(movie.id); return s })
        const body = await res.json().catch(() => ({}))
        setAddError(body.error ?? `Failed to add movie (${res.status})`)
      }
    } catch (err) {
      // Network error — revert
      setMovies(prev => prev.filter(m => m.tmdbId !== movie.id))
      setAddedIds(prev => { const s = new Set(prev); s.delete(movie.id); return s })
      setAddError('Network error. Please check your connection and try again.')
      console.error('[addMovie]', err)
    } finally {
      setAddingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldClass = 'w-full rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text'
  const rowIconClass = 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text disabled:cursor-not-allowed disabled:text-ns-subtle disabled:hover:bg-transparent'

  return (
    <Modal onClose={onClose} ariaLabelledBy="edit-collection-title" maxWidth="max-w-2xl">
      <div className="sticky top-0 z-[5] bg-ns-surface px-4 pb-4 pt-6 sm:px-6">
        <h2 id="edit-collection-title" className="pl-2 pr-12 font-display text-2xl text-ns-text sm:pl-0">Edit collection</h2>
        <PillTabs
          label="Edit collection sections"
          className="mt-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'details', label: 'Details' },
            { value: 'movies', label: 'Movies', count: movies.length },
            { value: 'add', label: 'Add movies' },
          ]}
        />
      </div>

      <div key={tab} className="min-h-[18rem] animate-fade-up">
        {tab === 'details' && (
          <div className="space-y-6 px-6 pb-6 pt-2">
            <div>
              <label htmlFor="edit-collection-name" className="mb-1.5 block text-sm font-semibold text-ns-text">Title *</label>
              <input
                id="edit-collection-name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                aria-invalid={detailsErr ? true : undefined}
                aria-describedby={detailsErr ? 'edit-collection-error' : undefined}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="edit-collection-description" className="mb-1.5 block text-sm font-semibold text-ns-text">Description</label>
              <textarea
                id="edit-collection-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className={cn(fieldClass, 'resize-none')}
                placeholder="What's this collection about?"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-ns-muted">{description.length}/500</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ns-text">Visibility</legend>
              <PillTabs
                label="Visibility"
                value={isPublic ? 'public' : 'private'}
                onChange={value => setIsPublic(value === 'public')}
                options={[
                  { value: 'public', label: 'Public' },
                  { value: 'private', label: 'Private' },
                ]}
              />
            </fieldset>

            {detailsErr && <p id="edit-collection-error" role="alert" className="text-sm text-ns-danger">{detailsErr}</p>}

            <Button onClick={saveDetails} loading={saving} className="w-full">
              {saving ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        )}

        {tab === 'movies' && (
          <div className="px-4 pb-4 pt-1 sm:px-6">
            {movies.length === 0 ? (
              <div className="py-14 text-center">
                <p className="font-heading text-lg font-bold text-ns-text">No movies yet.</p>
                <Button variant="outline" onClick={() => setTab('add')} className="mt-4">
                  <PlusIcon size={16} />
                  Add movies
                </Button>
              </div>
            ) : (
              <>
                <p aria-live="polite" className="mb-3 text-sm text-ns-muted">
                  {reordering
                    ? <span className="font-semibold text-ns-text">Saving order…</span>
                    : <>Drag rows or use the arrows to reorder. Changes save automatically.</>}
                </p>
                <ul className="space-y-1">
                  {movies.map((movie, idx) => (
                    <li
                      key={movie.tmdbId}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragEnter={() => onDragEnter(idx)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex cursor-grab select-none items-center gap-2 rounded-xl bg-ns-surface-2 py-1.5 pl-2 pr-1 active:cursor-grabbing sm:gap-3 sm:pl-3"
                    >
                      <span className="hidden w-5 flex-shrink-0 text-right text-sm tabular-nums text-ns-muted sm:block">{idx + 1}</span>
                      <div className="relative aspect-[2/3] w-8 flex-shrink-0 overflow-hidden rounded-md bg-ns-surface-3">
                        {movie.posterPath && (
                          <Image src={tmdbImageUrl(movie.posterPath, 'w185')} alt="" fill sizes="32px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ns-text">{movie.title}</p>
                        {movie.releaseDate && (
                          <p className="text-sm tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Move ${movie.title} up`}
                        disabled={idx === 0 || reordering}
                        onClick={() => moveMovie(idx, -1)}
                        className={rowIconClass}
                      >
                        <ChevronIcon direction="up" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${movie.title} down`}
                        disabled={idx === movies.length - 1 || reordering}
                        onClick={() => moveMovie(idx, 1)}
                        className={rowIconClass}
                      >
                        <ChevronIcon direction="down" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${movie.title} from collection`}
                        title="Remove from collection"
                        onClick={() => removeMovie(movie.tmdbId)}
                        className={cn(rowIconClass, 'hover:text-ns-danger')}
                      >
                        <CloseIcon size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div className="px-4 pb-4 pt-1 sm:px-6">
            <label htmlFor="edit-collection-search" className="sr-only">Search for a movie</label>
            <input
              id="edit-collection-search"
              value={query}
              onChange={e => { setQuery(e.target.value); setAddError('') }}
              placeholder="Search for a movie…"
              autoFocus
              className={cn(fieldClass, 'mb-4')}
            />

            {addError && (
              <p role="alert" className="mb-3 rounded-xl bg-ns-danger/10 px-3 py-2 text-sm text-ns-danger">{addError}</p>
            )}

            {searching && (
              <div role="status" aria-label="Searching movies" className="space-y-1">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-ns-surface-2" />
                ))}
              </div>
            )}

            {!searching && results.length > 0 && (
              <ul className="space-y-1">
                {results.map(movie => {
                  const already = addedIds.has(movie.id)
                  const adding  = addingId === movie.id
                  return (
                    <li key={movie.id} className="flex items-center gap-3 rounded-xl bg-ns-surface-2 p-1.5 pl-2">
                      <div className="relative aspect-[2/3] w-8 flex-shrink-0 overflow-hidden rounded-md bg-ns-surface-3">
                        {movie.poster_path && (
                          <Image src={tmdbImageUrl(movie.poster_path, 'w185')} alt="" fill sizes="32px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ns-text">{movie.title}</p>
                        {movie.release_date && (
                          <p className="text-sm tabular-nums text-ns-muted">{formatYear(movie.release_date)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => addMovie(movie)}
                        disabled={already || adding}
                        aria-label={already ? `${movie.title} added` : `Add ${movie.title}`}
                        className={cn(
                          'inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-150',
                          already
                            ? 'cursor-default bg-ns-success/10 text-ns-success'
                            : adding
                              ? 'cursor-wait bg-ns-surface-3 text-ns-muted'
                              : 'bg-ns-surface-3 text-ns-text hover:bg-ns-text hover:text-ns-bg',
                        )}
                      >
                        {already ? <><CheckIcon size={14} strokeWidth={3} /> Added</> : adding ? 'Adding…' : <><PlusIcon size={14} /> Add</>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {!searching && query && results.length === 0 && (
              <p className="py-8 text-center text-base text-ns-muted">No results for &ldquo;{query}&rdquo;</p>
            )}

            {!query && (
              <p className="py-8 text-center text-base text-ns-muted">Start typing to search movies</p>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-[5] flex items-center justify-between gap-3 border-t border-ns-border bg-ns-surface px-6 py-3">
        <p className="text-sm tabular-nums text-ns-muted">
          {movies.length} movie{movies.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
