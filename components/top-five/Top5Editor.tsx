'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { cn, tmdbImageUrl, formatYear } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import DnaPreview from './DnaPreview'
import type { TopFiveEntry } from '@/services/top-five'
import type { DNAScores } from '@/types'
import { ChevronIcon, CloseIcon, FilmIcon, PlusIcon, SearchIcon } from '@/components/icons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  genreIds:    number[]
}

interface DnaPreviewData {
  current:   DNAScores
  predicted: DNAScores
  deltas:    Record<keyof DNAScores, number>
}

interface Props {
  initialMovies: TopFiveEntry[]
  onSaved:       (movies: TopFiveEntry[]) => void
  onClose:       () => void
}

// ─── Slot component ───────────────────────────────────────────────────────────

const slotControlClass = 'flex h-11 min-w-0 flex-1 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text disabled:cursor-not-allowed disabled:text-ns-subtle disabled:hover:bg-transparent'

function Slot({
  movie,
  position,
  isDragOver,
  isSearching,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onAddClick,
  onMove,
}: {
  movie:       TopFiveEntry | null
  position:    number
  isDragOver:  boolean
  isSearching: boolean
  onDragStart: (pos: number) => void
  onDragOver:  (e: React.DragEvent, pos: number) => void
  onDrop:      (pos: number) => void
  onDragEnd:   () => void
  onRemove:    (pos: number) => void
  onAddClick:  (pos: number) => void
  onMove:      (pos: number, delta: -1 | 1) => void
}) {
  return (
    <div
      onDragOver={e => onDragOver(e, position)}
      onDrop={() => onDrop(position)}
      className="w-[8.5rem] flex-shrink-0 snap-start sm:w-auto sm:min-w-0 sm:flex-1"
    >
      {movie ? (
        <div
          draggable
          onDragStart={() => onDragStart(position)}
          onDragEnd={onDragEnd}
          className={cn(
            'relative aspect-[2/3] cursor-grab overflow-hidden rounded-xl bg-ns-surface-2 ring-2 transition-[box-shadow] duration-150 active:cursor-grabbing',
            isDragOver ? 'ring-ns-text' : 'ring-transparent',
          )}
        >
          {movie.posterPath ? (
            <Image
              src={tmdbImageUrl(movie.posterPath, 'w342')}
              alt=""
              fill
              sizes="140px"
              className="object-cover"
              draggable={false}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <FilmIcon size={28} className="text-ns-subtle" />
            </span>
          )}
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-bold tabular-nums text-white">
            {position}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAddClick(position)}
          aria-label={`Add a film at position ${position}`}
          className={cn(
            'relative flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-xl text-ns-muted ring-2 transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text',
            isDragOver || isSearching ? 'bg-ns-surface-3 text-ns-text ring-ns-text' : 'bg-ns-surface-2 ring-transparent',
          )}
        >
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ns-bg text-sm font-bold tabular-nums text-ns-muted">
            {position}
          </span>
          <PlusIcon size={20} />
          <span className="text-sm font-semibold">Add film</span>
        </button>
      )}

      <p className="mt-2 truncate text-center text-sm font-semibold text-ns-text">
        {movie ? movie.title : <span className="font-normal text-ns-muted">Position {position}</span>}
      </p>

      {movie && (
        <div className="mt-1 flex items-center rounded-full bg-ns-surface-2">
          <button
            type="button"
            aria-label={`Move ${movie.title} earlier`}
            disabled={position === 1}
            onClick={() => onMove(position, -1)}
            className={slotControlClass}
          >
            <ChevronIcon direction="left" size={16} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${movie.title}`}
            onClick={() => onRemove(position)}
            className={cn(slotControlClass, 'hover:text-ns-danger')}
          >
            <CloseIcon size={14} />
          </button>
          <button
            type="button"
            aria-label={`Move ${movie.title} later`}
            disabled={position === 5}
            onClick={() => onMove(position, 1)}
            className={slotControlClass}
          >
            <ChevronIcon direction="right" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Movie search ─────────────────────────────────────────────────────────────

function MovieSearch({
  onSelect,
  excludeIds,
}: {
  onSelect:   (movie: SearchResult) => void
  excludeIds: Set<number>
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function search(q: string) {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // /api/search returns { movies: TMDbMovie[], people: [...] }
        // TMDb field names: id, poster_path, release_date, genre_ids
        const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults((data.movies ?? []).map((r: {
          id: number
          title: string
          poster_path: string | null
          release_date: string | null
          genre_ids: number[]
        }) => ({
          tmdbId:      r.id,
          title:       r.title,
          posterPath:  r.poster_path  ?? null,
          releaseDate: r.release_date ?? null,
          genreIds:    r.genre_ids    ?? [],
        })))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted" />
        <input
          autoFocus
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search for a film…"
          aria-label="Search for a film"
          className="min-h-12 w-full rounded-xl border border-ns-border-strong bg-ns-bg py-2 pl-11 pr-11 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
        />
        {loading && (
          <span role="status" aria-label="Searching" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-ns-border-strong border-t-ns-text" />
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-[280px] space-y-0.5 overflow-y-auto">
          {results.map(r => {
            const already = excludeIds.has(r.tmdbId)
            return (
              <button
                key={r.tmdbId}
                type="button"
                onClick={() => !already && onSelect(r)}
                disabled={already}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-150',
                  already ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-ns-surface-3',
                )}
              >
                <span className="relative aspect-[2/3] w-9 flex-shrink-0 overflow-hidden rounded-lg bg-ns-surface-3">
                  {r.posterPath ? (
                    <Image src={tmdbImageUrl(r.posterPath, 'w185')} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <FilmIcon size={14} className="text-ns-subtle" />
                    </span>
                  )}
                </span>
                <span className="block min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-semibold', already ? 'text-ns-muted' : 'text-ns-text')}>{r.title}</span>
                  {r.releaseDate && (
                    <span className="block text-sm tabular-nums text-ns-muted">{formatYear(r.releaseDate)}</span>
                  )}
                </span>
                {already && <span className="flex-shrink-0 text-sm text-ns-muted">Already in Top 5</span>}
              </button>
            )
          })}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <p className="py-4 text-center text-sm text-ns-muted">No results for &ldquo;{query}&rdquo;</p>
      )}
    </div>
  )
}

// ─── History panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ onRestore }: { onRestore: (movies: TopFiveEntry[]) => void }) {
  const [history, setHistory] = useState<{ id: string; movies: TopFiveEntry[]; savedAt: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/top-five/history')
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function restore(snap: typeof history[0]) {
    setRestoring(snap.id)
    onRestore(snap.movies)
    setRestoring(null)
  }

  if (loading) return <Skeleton className="h-24 rounded-xl bg-ns-surface-2" />
  if (history.length === 0) return (
    <p className="py-4 text-center text-sm text-ns-muted">No previous lists saved yet.</p>
  )

  return (
    <ul className="max-h-[300px] divide-y divide-ns-border overflow-y-auto rounded-xl bg-ns-surface-2 px-3">
      {history.map(snap => (
        <li key={snap.id} className="flex items-center gap-3 py-2.5">
          <div aria-hidden="true" className="flex flex-shrink-0 gap-1">
            {snap.movies.slice(0, 3).map(m => (
              <div key={m.tmdbId} className="relative aspect-[2/3] w-7 overflow-hidden rounded bg-ns-surface-3">
                {m.posterPath && (
                  <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt="" fill sizes="28px" className="object-cover" />
                )}
              </div>
            ))}
            {snap.movies.length > 3 && (
              <div className="flex aspect-[2/3] w-7 items-center justify-center rounded bg-ns-surface-3">
                <span className="text-xs tabular-nums text-ns-muted">+{snap.movies.length - 3}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ns-text">
              {snap.movies.map(m => m.title).join(', ')}
            </p>
            <p className="text-sm tabular-nums text-ns-muted">
              {new Date(snap.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => restore(snap)}
            disabled={restoring === snap.id}
            className="min-h-11 flex-shrink-0 rounded-full px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
          >
            Restore
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function Top5Editor({ initialMovies, onSaved, onClose }: Props) {
  // Build slots array (positions 1–5, null if empty)
  const [slots, setSlots] = useState<(TopFiveEntry | null)[]>(() => {
    const arr: (TopFiveEntry | null)[] = [null, null, null, null, null]
    for (const m of initialMovies) {
      if (m.position >= 1 && m.position <= 5) arr[m.position - 1] = m
    }
    return arr
  })

  const [draggingFrom, setDraggingFrom] = useState<number | null>(null)  // 0-indexed
  const [dragOverPos,  setDragOverPos]  = useState<number | null>(null)  // 0-indexed
  const [searchingFor, setSearchingFor] = useState<number | null>(null)  // position 1–5 or null (add to first empty)
  const [showHistory,  setShowHistory]  = useState(false)
  const [preview,      setPreview]      = useState<DnaPreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build TopFiveEntry[] from slots
  const toEntries = useCallback((s: (TopFiveEntry | null)[]): TopFiveEntry[] =>
    s
      .map((m, i) => m ? { ...m, position: i + 1 } : null)
      .filter((m): m is TopFiveEntry => m !== null)
  , [])

  // Fetch DNA preview with debounce
  const fetchPreview = useCallback((s: (TopFiveEntry | null)[]) => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setPreviewLoading(true)
    previewTimer.current = setTimeout(async () => {
      try {
        const entries = toEntries(s)
        if (entries.length === 0) { setPreviewLoading(false); return }
        const res  = await fetch('/api/top-five/preview', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ movies: entries }),
        })
        if (res.ok) setPreview(await res.json())
      } catch { /* silently */ }
      finally { setPreviewLoading(false) }
    }, 400)
  }, [toEntries])

  // Fetch initial preview
  useEffect(() => { fetchPreview(slots) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function handleDragStart(pos: number) {
    setDraggingFrom(pos - 1)  // convert to 0-indexed
  }

  function handleDragOver(e: React.DragEvent, pos: number) {
    e.preventDefault()
    setDragOverPos(pos - 1)
  }

  function handleDrop(pos: number) {
    if (draggingFrom === null) return
    const toIdx = pos - 1
    if (draggingFrom === toIdx) { setDraggingFrom(null); setDragOverPos(null); return }

    setSlots(prev => {
      const next = [...prev]
      // Swap the two positions
      ;[next[draggingFrom], next[toIdx]] = [next[toIdx], next[draggingFrom]]
      fetchPreview(next)
      return next
    })
    setDraggingFrom(null)
    setDragOverPos(null)
  }

  function handleDragEnd() {
    setDraggingFrom(null)
    setDragOverPos(null)
  }

  function moveSlot(position: number, delta: -1 | 1) {
    const from = position - 1
    const to = from + delta
    if (to < 0 || to > 4) return
    setSlots(prev => {
      const next = [...prev]
      ;[next[from], next[to]] = [next[to], next[from]]
      fetchPreview(next)
      return next
    })
  }

  // ── Search result selected ────────────────────────────────────────────────────

  function handleSearchSelect(result: SearchResult) {
    const movie: TopFiveEntry = {
      tmdbId:      result.tmdbId,
      title:       result.title,
      posterPath:  result.posterPath,
      releaseDate: result.releaseDate,
      genreIds:    result.genreIds,
      position:    0,  // set when building entries
    }

    setSlots(prev => {
      const next = [...prev]
      if (searchingFor !== null) {
        // Replace specific slot
        next[searchingFor - 1] = movie
      } else {
        // Fill first empty slot
        const idx = next.findIndex(s => s === null)
        if (idx !== -1) next[idx] = movie
      }
      fetchPreview(next)
      return next
    })
    setSearchingFor(null)
  }

  // ── Remove ────────────────────────────────────────────────────────────────────

  function removeSlot(position: number) {
    setSlots(prev => {
      const next = [...prev]
      next[position - 1] = null
      fetchPreview(next)
      return next
    })
  }

  // ── Restore from history ──────────────────────────────────────────────────────

  function handleRestore(movies: TopFiveEntry[]) {
    const arr: (TopFiveEntry | null)[] = [null, null, null, null, null]
    for (const m of movies) {
      if (m.position >= 1 && m.position <= 5) arr[m.position - 1] = m
    }
    setSlots(arr)
    fetchPreview(arr)
    setShowHistory(false)
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const entries = toEntries(slots)
    if (entries.length === 0) { setError('Add at least one film'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/top-five', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ movies: entries }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error saving'); return }
      onSaved(entries)
    } catch {
      setError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  const excludeIds = new Set(slots.filter(Boolean).map(m => m!.tmdbId))
  const filledCount = slots.filter(Boolean).length

  return createPortal(
    <Modal onClose={onClose} ariaLabelledBy="top5-editor-title" maxWidth="max-w-3xl">
      <div className="px-6 pb-2 pr-16 pt-6">
        <h2 id="top5-editor-title" className="font-display text-3xl text-ns-text">Edit Top 5</h2>
        <p className="mt-1 text-sm tabular-nums text-ns-muted">
          {filledCount}/5 films · Drag to reorder · Changes update your Movie DNA
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-1 scrollbar-hide sm:mx-0 sm:overflow-visible sm:px-0">
          {slots.map((movie, i) => (
            <Slot
              key={i}
              movie={movie}
              position={i + 1}
              isDragOver={dragOverPos === i}
              isSearching={searchingFor === i + 1}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onRemove={removeSlot}
              onAddClick={pos => setSearchingFor(pos)}
              onMove={moveSlot}
            />
          ))}
        </div>

        {searchingFor !== null ? (
          <div className="animate-fade-up rounded-2xl bg-ns-surface-2 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-heading text-base font-bold text-ns-text">
                Choose film for position #{searchingFor}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSearchingFor(null)} className="hover:bg-ns-surface-3">
                Cancel
              </Button>
            </div>
            <MovieSearch onSelect={handleSearchSelect} excludeIds={excludeIds} />
          </div>
        ) : filledCount < 5 ? (
          <Button
            variant="outline"
            onClick={() => {
              const firstEmpty = slots.findIndex(s => s === null) + 1
              setSearchingFor(firstEmpty)
            }}
            className="w-full hover:bg-ns-surface-2"
          >
            <PlusIcon size={16} />
            Search for a film to add
          </Button>
        ) : null}

        {preview && (
          <DnaPreview
            current={preview.current}
            predicted={preview.predicted}
            deltas={preview.deltas}
            loading={previewLoading}
          />
        )}

        <div>
          <button
            type="button"
            aria-expanded={showHistory}
            onClick={() => setShowHistory(v => !v)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:text-ns-text"
          >
            <ChevronIcon
              direction="down"
              size={16}
              className={cn('transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]', showHistory && 'rotate-180')}
            />
            {showHistory ? 'Hide' : 'Show'} previous lists
          </button>
          {showHistory && (
            <div className="mt-2 animate-fade-up">
              <HistoryPanel onRestore={handleRestore} />
            </div>
          )}
        </div>

        {error && <p role="alert" className="rounded-xl bg-ns-danger/10 px-3 py-2 text-sm text-ns-danger">{error}</p>}
      </div>

      <div className="sticky bottom-0 z-[5] flex flex-col gap-3 border-t border-ns-border bg-ns-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ns-muted">Your DNA updates automatically after saving.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={filledCount === 0} className="flex-1 sm:flex-none">
            {saving ? 'Saving…' : 'Save Top 5'}
          </Button>
        </div>
      </div>
    </Modal>,
    document.body,
  )
}
