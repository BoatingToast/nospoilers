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
import { tmdbImageUrl, formatYear } from '@/lib/utils'
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

  // ── Keyboard close ────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — z-10 to sit above backdrop */}
      <div className="relative z-10 w-full max-w-2xl bg-ns-surface border border-ns-border rounded-2xl
                      shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ns-border flex-shrink-0">
          <h2 className="font-display text-xl tracking-wider text-ns-text">EDIT COLLECTION</h2>
          <button
            onClick={onClose}
            className="text-ns-muted hover:text-ns-text transition-colors p-1"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ns-border flex-shrink-0">
          {(['details', 'movies', 'add'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-xs font-body tracking-widest uppercase transition-colors relative
                ${tab === t ? 'text-ns-gold' : 'text-ns-muted hover:text-ns-text'}`}
            >
              {t === 'details' ? 'Details' : t === 'movies' ? `Movies (${movies.length})` : 'Add Movies'}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ns-gold" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Details tab ───────────────────────────────────────────── */}
          {tab === 'details' && (
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-body tracking-widest uppercase text-ns-muted mb-2">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full bg-ns-bg border border-ns-border rounded-xl px-4 py-3
                             text-ns-text font-body text-sm placeholder:text-ns-muted/40
                             focus:outline-none focus:border-ns-gold/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-body tracking-widest uppercase text-ns-muted mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full bg-ns-bg border border-ns-border rounded-xl px-4 py-3
                             text-ns-text font-body text-sm placeholder:text-ns-muted/40
                             focus:outline-none focus:border-ns-gold/60 transition-colors resize-none"
                  placeholder="What's this collection about?"
                />
                <p className="text-ns-muted/40 text-xs font-body text-right mt-1">
                  {description.length}/500
                </p>
              </div>

              <div>
                <label className="block text-xs font-body tracking-widest uppercase text-ns-muted mb-3">
                  Visibility
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-body transition-colors
                      ${isPublic
                        ? 'border-ns-gold text-ns-gold bg-ns-gold/10'
                        : 'border-ns-border text-ns-muted hover:border-ns-muted/40'}`}
                  >
                    🌍 Public
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-body transition-colors
                      ${!isPublic
                        ? 'border-ns-gold text-ns-gold bg-ns-gold/10'
                        : 'border-ns-border text-ns-muted hover:border-ns-muted/40'}`}
                  >
                    🔒 Private
                  </button>
                </div>
              </div>

              {detailsErr && (
                <p className="text-red-400 text-xs font-body">{detailsErr}</p>
              )}

              <button
                onClick={saveDetails}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-ns-gold text-ns-bg font-body text-sm
                           font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Details'}
              </button>
            </div>
          )}

          {/* ── Movies tab ────────────────────────────────────────────── */}
          {tab === 'movies' && (
            <div className="p-4">
              {movies.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-ns-muted font-body text-sm">No movies yet.</p>
                  <button
                    onClick={() => setTab('add')}
                    className="mt-3 text-ns-gold text-xs font-body hover:text-amber-400 transition-colors"
                  >
                    + Add Movies
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-ns-muted/50 text-xs font-body mb-3">
                    Drag rows to reorder. Changes save automatically.
                    {reordering && <span className="ml-2 text-ns-gold">Saving order…</span>}
                  </p>
                  <div className="space-y-2">
                    {movies.map((movie, idx) => (
                      <div
                        key={movie.tmdbId}
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragEnter={() => onDragEnter(idx)}
                        onDragEnd={onDragEnd}
                        onDragOver={e => e.preventDefault()}
                        className="flex items-center gap-3 bg-ns-bg border border-ns-border rounded-xl
                                   p-2 cursor-grab active:cursor-grabbing group hover:border-ns-gold/30
                                   transition-colors select-none"
                      >
                        {/* Drag handle */}
                        <div className="text-ns-muted/30 group-hover:text-ns-muted/60 transition-colors flex-shrink-0 pl-1">
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="8"  cy="6"  r="1.5"/>
                            <circle cx="16" cy="6"  r="1.5"/>
                            <circle cx="8"  cy="12" r="1.5"/>
                            <circle cx="16" cy="12" r="1.5"/>
                            <circle cx="8"  cy="18" r="1.5"/>
                            <circle cx="16" cy="18" r="1.5"/>
                          </svg>
                        </div>

                        {/* Position */}
                        <span className="text-ns-muted/40 text-xs font-body w-5 text-right flex-shrink-0">
                          {idx + 1}
                        </span>

                        {/* Poster */}
                        <div className="w-8 h-12 rounded-md overflow-hidden bg-ns-surface flex-shrink-0">
                          {movie.posterPath ? (
                            <Image
                              src={tmdbImageUrl(movie.posterPath, 'w185')}
                              alt={movie.title}
                              width={32} height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-ns-border" />
                          )}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-ns-text text-sm font-body truncate">{movie.title}</p>
                          {movie.releaseDate && (
                            <p className="text-ns-muted/40 text-xs font-body">{formatYear(movie.releaseDate)}</p>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeMovie(movie.tmdbId)}
                          className="text-ns-muted/40 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                          title="Remove from collection"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Add Movies tab ─────────────────────────────────────────── */}
          {tab === 'add' && (
            <div className="p-4">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setAddError('') }}
                placeholder="Search for a movie…"
                autoFocus
                className="w-full bg-ns-bg border border-ns-border rounded-xl px-4 py-3
                           text-ns-text font-body text-sm placeholder:text-ns-muted/40
                           focus:outline-none focus:border-ns-gold/60 transition-colors mb-4"
              />

              {addError && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-xs font-body">{addError}</p>
                </div>
              )}

              {searching && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-ns-bg rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {!searching && results.length > 0 && (
                <div className="space-y-2">
                  {results.map(movie => {
                    const already = addedIds.has(movie.id)
                    const adding  = addingId === movie.id
                    return (
                      <div
                        key={movie.id}
                        className="flex items-center gap-3 bg-ns-bg border border-ns-border rounded-xl p-2"
                      >
                        <div className="w-8 h-12 rounded-md overflow-hidden bg-ns-surface flex-shrink-0">
                          {movie.poster_path ? (
                            <Image
                              src={tmdbImageUrl(movie.poster_path, 'w185')}
                              alt={movie.title}
                              width={32} height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-ns-border" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-ns-text text-sm font-body truncate">{movie.title}</p>
                          {movie.release_date && (
                            <p className="text-ns-muted/40 text-xs font-body">{formatYear(movie.release_date)}</p>
                          )}
                        </div>

                        <button
                          onClick={() => addMovie(movie)}
                          disabled={already || adding}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-body transition-colors
                            ${already
                              ? 'border border-emerald-500/30 text-emerald-400 cursor-default'
                              : adding
                                ? 'border border-ns-gold/30 text-ns-gold/50 cursor-wait'
                                : 'border border-ns-gold/50 text-ns-gold hover:bg-ns-gold/10'}`}
                        >
                          {already ? '✓ Added' : adding ? 'Adding…' : '+ Add'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {!searching && query && results.length === 0 && (
                <p className="text-ns-muted font-body text-sm text-center py-8">
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}

              {!query && (
                <p className="text-ns-muted/40 font-body text-sm text-center py-8">
                  Start typing to search movies
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-ns-border flex-shrink-0 bg-ns-surface">
          <p className="text-ns-muted/40 text-xs font-body">
            {movies.length} movie{movies.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-ns-border text-ns-muted text-xs
                       font-body hover:border-ns-muted/60 hover:text-ns-text transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
