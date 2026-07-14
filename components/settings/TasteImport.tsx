'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ImportPreview from './ImportPreview'
import type {
  TasteImportHistoryItem,
  TasteImportPreviewItem,
  TasteImportSource,
} from '@/services/imports/types'

interface SuggestedFavorite {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  genreIds: number[]
}

interface PreviewResponse {
  batchId: string
  source: TasteImportSource
  fileName: string
  totalRows: number
  matchedRows: number
  conflictRows: number
  unmatchedRows: number
  items: TasteImportPreviewItem[]
}

interface Props {
  compact?: boolean
  onImported?: (favorites: SuggestedFavorite[]) => void
}

export default function TasteImport({ compact = false, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<'auto' | TasteImportSource>('auto')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [choices, setChoices] = useState<Record<string, number | null>>({})
  const [history, setHistory] = useState<TasteImportHistoryItem[]>([])
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [historyDetails, setHistoryDetails] = useState<Record<string, Array<{
    rowKey: string
    importedTitle: string
    importedYear: number | null
    matchedTitle: string | null
    matchedYear: number | null
    tmdbId: number | null
    ratingScore: number | null
    watched: boolean
    watchlist: boolean
    hasReview: boolean
  }>>>({})
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    imported: number; ratings: number; watched: number; watchlist: number; reviews: number; warning?: string | null
  } | null>(null)

  const loadHistory = useCallback(() => {
    if (compact) return
    fetch('/api/import')
      .then(response => response.ok ? response.json() : { batches: [] })
      .then(data => setHistory(Array.isArray(data.batches) ? data.batches : []))
      .catch(() => {})
  }, [compact])

  useEffect(() => { loadHistory() }, [loadHistory])

  const selectedCount = useMemo(
    () => Object.values(choices).filter((value): value is number => typeof value === 'number').length,
    [choices],
  )

  async function createPreview() {
    if (!file) {
      setError('Choose a Letterboxd or IMDb CSV/ZIP export first.')
      return
    }
    setBusy('preview')
    setError('')
    setSuccess(null)
    try {
      const form = new FormData()
      form.set('file', file)
      if (source !== 'auto') form.set('source', source)
      const response = await fetch('/api/import/preview', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not preview this import.')
      const next = data as PreviewResponse
      setPreview(next)
      setChoices(Object.fromEntries(next.items.map(item => [
        item.rowKey,
        item.status === 'matched' ? item.selectedTmdbId : null,
      ])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview this import.')
    } finally {
      setBusy(null)
    }
  }

  async function commitImport() {
    if (!preview || selectedCount === 0) return
    setBusy('commit')
    setError('')
    try {
      const selections = Object.entries(choices).flatMap(([rowKey, tmdbId]) =>
        typeof tmdbId === 'number' ? [{ rowKey, tmdbId }] : [],
      )
      const response = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: preview.batchId, selections }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Import failed.')
      setSuccess({ ...data.summary, warning: data.warning })
      setPreview(null)
      setFile(null)
      setChoices({})
      if (inputRef.current) inputRef.current.value = ''
      loadHistory()
      onImported?.(data.suggestedFavorites ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(null)
    }
  }

  function startOver() {
    setPreview(null)
    setChoices({})
    setError('')
  }

  async function toggleHistory(batchId: string) {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
      return
    }
    setExpandedBatch(batchId)
    if (historyDetails[batchId]) return
    try {
      const response = await fetch(`/api/import/${batchId}`)
      const data = await response.json()
      if (response.ok) {
        setHistoryDetails(current => ({ ...current, [batchId]: Array.isArray(data.items) ? data.items : [] }))
      }
    } catch {
      setHistoryDetails(current => ({ ...current, [batchId]: [] }))
    }
  }

  return (
    <div className={compact ? '' : 'space-y-8'}>
      <div className={compact ? 'rounded-2xl border border-ns-border bg-ns-bg/30 p-4 sm:p-5' : 'rounded-2xl border border-ns-border bg-ns-surface p-5 sm:p-6'}>
        {!preview ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-heading font-semibold text-ns-text">Import your movie history</h2>
              <p className="mt-1 text-sm font-body leading-relaxed text-ns-muted">
                Bring over ratings, watched films, watchlist entries, dates, and reviews. Imported activity will not flood your friends&apos; feeds.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-body uppercase tracking-widest text-ns-muted">Source</span>
                <select
                  value={source}
                  onChange={event => setSource(event.target.value as typeof source)}
                  className="w-full rounded-xl border border-ns-border bg-ns-bg px-3 py-2.5 text-sm font-body text-ns-text focus:border-ns-secondary/50 focus:outline-none"
                >
                  <option value="auto">Detect automatically</option>
                  <option value="letterboxd">Letterboxd</option>
                  <option value="imdb">IMDb</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-body uppercase tracking-widest text-ns-muted">CSV or ZIP export</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.zip,text/csv,application/zip"
                  onChange={event => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-xl border border-ns-border bg-ns-bg text-sm font-body text-ns-muted file:mr-3 file:border-0 file:border-r file:border-ns-border file:bg-white/5 file:px-4 file:py-2.5 file:text-xs file:font-body file:text-ns-text hover:file:bg-white/10"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-body text-ns-muted/60">Up to 10 MB and 500 unique movies per import.</p>
              <button
                type="button"
                onClick={createPreview}
                disabled={!file || busy !== null}
                className="rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === 'preview' ? 'Matching movies…' : 'Preview import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-ns-secondary">Preview</p>
                <h2 className="mt-1 text-lg font-heading font-semibold text-ns-text">{preview.fileName}</h2>
                <p className="mt-1 text-xs font-body text-ns-muted">
                  {preview.matchedRows} exact · {preview.conflictRows} need review · {preview.unmatchedRows} unmatched
                </p>
              </div>
              <button type="button" onClick={startOver} className="text-xs font-body text-ns-muted hover:text-ns-text">Choose another file</button>
            </div>

            <ImportPreview
              items={preview.items}
              choices={choices}
              onChoice={(rowKey, tmdbId) => setChoices(current => ({ ...current, [rowKey]: tmdbId }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ns-border/60 pt-4">
              <p className="text-xs font-body text-ns-muted">{selectedCount} movies selected</p>
              <button
                type="button"
                onClick={commitImport}
                disabled={selectedCount === 0 || busy !== null}
                className="rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === 'commit' ? 'Importing and rebuilding DNA…' : `Import ${selectedCount} movies`}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-body text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-body font-medium text-emerald-300">Imported {success.imported} movies successfully.</p>
            <p className="mt-1 text-xs font-body text-emerald-200/70">
              {success.ratings} ratings · {success.watched} watched · {success.watchlist} watchlist · {success.reviews} reviews
            </p>
            {success.warning && <p className="mt-2 text-xs font-body text-amber-200">{success.warning}</p>}
          </div>
        )}
      </div>

      {!compact && (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-heading font-semibold text-ns-text">Import history</h2>
            <p className="mt-1 text-xs font-body text-ns-muted">Re-importing updates movies with the same TMDb ID instead of creating duplicates.</p>
          </div>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ns-border p-8 text-center text-sm font-body text-ns-muted/60">No previous imports.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ns-border bg-ns-surface divide-y divide-ns-border/50">
              {history.map(batch => (
                <div key={batch.id}>
                  <button
                    type="button"
                    onClick={() => toggleHistory(batch.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.025] sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-body font-medium text-ns-text">{batch.fileName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-body ${batch.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          {batch.status === 'completed' ? 'Completed' : 'Preview only'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-body text-ns-muted/60">
                        {new Date(batch.completedAt ?? batch.createdAt).toLocaleDateString()} · {batch.source === 'imdb' ? 'IMDb' : 'Letterboxd'} · Inspect
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-display tracking-wider text-ns-text">{batch.summary?.imported ?? batch.matchedRows}</p>
                      <p className="text-[10px] font-body uppercase tracking-wider text-ns-muted/60">movies {expandedBatch === batch.id ? '↑' : '↓'}</p>
                    </div>
                  </button>

                  {expandedBatch === batch.id && (
                    <div className="border-t border-ns-border/40 bg-ns-bg/30 px-4 py-3 sm:px-5">
                      {!historyDetails[batch.id] ? (
                        <p className="py-3 text-xs font-body text-ns-muted">Loading import details…</p>
                      ) : historyDetails[batch.id].length === 0 ? (
                        <p className="py-3 text-xs font-body text-ns-muted">No committed movies in this preview.</p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-ns-border/30">
                          {historyDetails[batch.id].map(item => (
                            <div key={item.rowKey} className="flex items-center justify-between gap-3 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-body text-ns-text">
                                  {item.matchedTitle ?? item.importedTitle}{item.matchedYear ?? item.importedYear ? ` (${item.matchedYear ?? item.importedYear})` : ''}
                                </p>
                                {item.matchedTitle && item.matchedTitle !== item.importedTitle && (
                                  <p className="truncate text-[10px] font-body text-ns-muted/50">Imported as “{item.importedTitle}”</p>
                                )}
                              </div>
                              <p className="flex-shrink-0 text-[10px] font-body text-ns-muted/60">
                                {item.ratingScore !== null ? `${item.ratingScore}/100` : item.watched ? 'Watched' : item.watchlist ? 'Watchlist' : 'Movie'}
                                {item.hasReview ? ' · Review' : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
