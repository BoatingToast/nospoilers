'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import DnaPreview from './DnaPreview'
import type { TopFiveEntry } from '@/services/top-five'
import type { DNAScores } from '@/types'
import { FilmIcon } from '@/components/icons'

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

function Slot({
  movie,
  position,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onAddClick,
}: {
  movie:       TopFiveEntry | null
  position:    number
  isDragOver:  boolean
  onDragStart: (pos: number) => void
  onDragOver:  (e: React.DragEvent, pos: number) => void
  onDrop:      (pos: number) => void
  onDragEnd:   () => void
  onRemove:    (pos: number) => void
  onAddClick:  (pos: number) => void
}) {
  return (
    <div
      onDragOver={e => onDragOver(e, position)}
      onDrop={() => onDrop(position)}
      className={`relative flex-1 min-w-0 transition-all duration-150 ${
        isDragOver ? 'scale-105' : ''
      }`}
    >
      {/* Rank badge */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-6 h-6 rounded-full
                       flex items-center justify-center text-[10px] font-display leading-none
                       border-2 transition-colors ${
                         movie
                           ? 'bg-ns-bg border-ns-gold text-ns-gold'
                           : 'bg-ns-bg border-ns-border text-ns-muted'
                       }`}>
        {position}
      </div>

      {movie ? (
        <div
          draggable
          onDragStart={() => onDragStart(position)}
          onDragEnd={onDragEnd}
          className={`relative aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface group cursor-grab active:cursor-grabbing
                       border-2 transition-all duration-150 shadow-lg
                       ${isDragOver ? 'border-ns-gold shadow-ns-gold/20' : 'border-ns-border hover:border-ns-gold/40'}`}
        >
          {/* Poster */}
          {movie.posterPath ? (
            <Image
              src={tmdbImageUrl(movie.posterPath, 'w342')}
              alt={movie.title}
              fill
              sizes="140px"
              className="object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmIcon size={28} className="text-ns-muted/30" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Drag handle hint */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                          transition-opacity duration-200">
            <div className="flex flex-col gap-0.5 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                </div>
              ))}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(position)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/20
                       flex items-center justify-center text-white text-xs
                       opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/80"
            aria-label={`Remove ${movie.title}`}
          >
            ✕
          </button>

          {/* Title at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-white text-[10px] font-heading font-semibold leading-tight line-clamp-2">{movie.title}</p>
            {movie.releaseDate && (
              <p className="text-white/60 text-[9px] font-body">{formatYear(movie.releaseDate)}</p>
            )}
          </div>
        </div>
      ) : (
        /* Empty slot */
        <button
          onClick={() => onAddClick(position)}
          className={`w-full aspect-[2/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5
                       transition-all duration-150 group
                       ${isDragOver
                           ? 'border-ns-gold bg-ns-gold/10'
                           : 'border-ns-border hover:border-ns-gold/50 hover:bg-ns-gold/5'
                       }`}
        >
          <span className={`text-xl transition-colors ${isDragOver ? 'text-ns-gold' : 'text-ns-muted group-hover:text-ns-gold'}`}>
            +
          </span>
          <span className="text-[10px] font-body text-ns-muted group-hover:text-white transition-colors hidden sm:block">
            Add film
          </span>
        </button>
      )}

      {/* Title below slot */}
      <p className="text-[10px] font-body text-ns-muted text-center mt-2 truncate px-0.5">
        {movie ? movie.title : `Position ${position}`}
      </p>
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
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ns-muted pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search for a film…"
          className="w-full pl-10 pr-4 py-2.5 bg-ns-bg border border-ns-border rounded-xl text-sm font-body
                     text-ns-text placeholder-ns-muted/50 focus:outline-none focus:border-ns-gold/50 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-ns-gold/30 border-t-ns-gold rounded-full animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-hide">
          {results.map(r => {
            const already = excludeIds.has(r.tmdbId)
            return (
              <button
                key={r.tmdbId}
                onClick={() => !already && onSelect(r)}
                disabled={already}
                className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                  already
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-white/5 cursor-pointer'
                }`}
              >
                <div className="w-8 h-12 rounded-lg overflow-hidden bg-ns-surface flex-shrink-0">
                  {r.posterPath ? (
                    <Image
                      src={tmdbImageUrl(r.posterPath, 'w185')}
                      alt={r.title}
                      width={32} height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FilmIcon size={14} className="text-ns-muted/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-medium text-white truncate">{r.title}</p>
                  {r.releaseDate && (
                    <p className="text-[11px] font-body text-ns-muted">{formatYear(r.releaseDate)}</p>
                  )}
                </div>
                {already && (
                  <span className="text-[10px] font-body text-ns-muted flex-shrink-0">Already in Top 5</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <p className="text-sm font-body text-ns-muted text-center py-4">No results for "{query}"</p>
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

  if (loading) return <div className="animate-pulse h-24 bg-ns-surface rounded-xl" />
  if (history.length === 0) return (
    <p className="text-ns-muted text-sm font-body text-center py-4">No previous lists saved yet.</p>
  )

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
      {history.map(snap => (
        <div key={snap.id} className="flex items-center gap-3 p-3 rounded-xl bg-ns-surface border border-ns-border">
          {/* Mini poster strip */}
          <div className="flex gap-1 flex-shrink-0">
            {snap.movies.slice(0, 3).map(m => (
              <div key={m.tmdbId} className="w-7 h-10 rounded overflow-hidden bg-ns-border">
                {m.posterPath && (
                  <Image src={tmdbImageUrl(m.posterPath, 'w185')} alt={m.title}
                    width={28} height={40} className="object-cover w-full h-full" />
                )}
              </div>
            ))}
            {snap.movies.length > 3 && (
              <div className="w-7 h-10 rounded bg-ns-border flex items-center justify-center">
                <span className="text-[9px] text-ns-muted font-body">+{snap.movies.length - 3}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-heading font-medium text-white truncate">
              {snap.movies.map(m => m.title).join(', ')}
            </p>
            <p className="text-[10px] font-body text-ns-muted">
              {new Date(snap.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => restore(snap)}
            disabled={restoring === snap.id}
            className="text-xs font-heading font-medium text-ns-gold hover:text-amber-400 transition-colors flex-shrink-0"
          >
            Restore
          </button>
        </div>
      ))}
    </div>
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

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-ns-surface border border-ns-border rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ns-border flex-shrink-0">
          <div>
            <h2 className="font-display text-2xl tracking-wider text-white">EDIT TOP 5</h2>
            <p className="text-xs font-body text-ns-muted mt-0.5">
              {filledCount}/5 films · Drag to reorder · Changes update your Movie DNA
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-ns-muted hover:text-white transition-colors text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Slot grid */}
          <div className="flex gap-3 sm:gap-4 mt-3">
            {slots.map((movie, i) => (
              <Slot
                key={i}
                movie={movie}
                position={i + 1}
                isDragOver={dragOverPos === i}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onRemove={removeSlot}
                onAddClick={pos => setSearchingFor(pos)}
              />
            ))}
          </div>

          {/* Search panel */}
          {searchingFor !== null ? (
            <div className="rounded-2xl bg-ns-bg border border-ns-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-heading font-semibold text-white">
                  Choose film for position #{searchingFor}
                </p>
                <button onClick={() => setSearchingFor(null)} className="text-ns-muted hover:text-white text-sm transition-colors">
                  Cancel
                </button>
              </div>
              <MovieSearch onSelect={handleSearchSelect} excludeIds={excludeIds} />
            </div>
          ) : filledCount < 5 ? (
            /* Quick-add button when slots are empty */
            <button
              onClick={() => {
                const firstEmpty = slots.findIndex(s => s === null) + 1
                setSearchingFor(firstEmpty)
              }}
              className="w-full py-3 rounded-xl border border-dashed border-ns-border text-ns-muted text-sm font-body hover:border-ns-gold/40 hover:text-white transition-colors"
            >
              + Search for a film to add
            </button>
          ) : null}

          {/* DNA Preview */}
          {preview && (
            <DnaPreview
              current={preview.current}
              predicted={preview.predicted}
              deltas={preview.deltas}
              loading={previewLoading}
            />
          )}

          {/* History */}
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 text-xs font-heading font-medium text-ns-muted hover:text-white transition-colors"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Hide' : 'Show'} Previous Lists
            </button>
            {showHistory && (
              <div className="mt-3">
                <HistoryPanel onRestore={handleRestore} />
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm font-body">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ns-border flex items-center justify-between gap-3 flex-shrink-0 bg-ns-surface">
          <p className="text-xs font-body text-ns-muted">
            Your DNA updates automatically after saving.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-ns-border text-ns-muted text-sm font-heading font-medium hover:text-white hover:border-white/20 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="px-6 py-2 rounded-xl bg-ns-gold text-ns-bg text-sm font-heading font-semibold
                         hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save Top 5'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
