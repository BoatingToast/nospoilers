'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ChevronIcon } from '@/components/icons'
import ImportPreview from './ImportPreview'
import { Field, SelectControl } from './FormControls'
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
    <div className={compact ? '' : 'space-y-10'}>
      <div className={compact ? 'rounded-2xl border border-ns-border p-4 sm:p-5' : 'rounded-2xl bg-ns-surface p-6 sm:p-8'}>
        {!preview ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-xl font-bold text-ns-text">Import your movie history</h2>
              <p className="mt-1 text-base leading-relaxed text-ns-muted">
                Bring over ratings, watched films, watchlist entries, dates, and reviews. Imported activity will not flood your friends&apos; feeds.
              </p>
              <a
                href="https://www.youtube.com/watch?v=Vj90ijGE6tQ"
                target="_blank"
                rel="noopener noreferrer"
                className="-ml-3 mt-1 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-surface-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m10 8 6 4-6 4Z" />
                </svg>
                Watch the import walkthrough
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
              <Field id="import-source" label="Source">
                <SelectControl
                  id="import-source"
                  value={source}
                  onChange={event => setSource(event.target.value as typeof source)}
                >
                  <option value="auto">Detect automatically</option>
                  <option value="letterboxd">Letterboxd</option>
                  <option value="imdb">IMDb</option>
                </SelectControl>
              </Field>

              <Field id="import-file" label="CSV or ZIP export">
                <input
                  id="import-file"
                  ref={inputRef}
                  type="file"
                  accept=".csv,.zip,text/csv,application/zip"
                  onChange={event => setFile(event.target.files?.[0] ?? null)}
                  className="block min-h-12 w-full min-w-0 cursor-pointer rounded-xl border border-ns-border-strong bg-ns-bg text-sm text-ns-muted transition-colors file:mr-3 file:min-h-12 file:cursor-pointer file:border-0 file:bg-ns-surface-2 file:px-4 file:text-sm file:font-semibold file:text-ns-text hover:file:bg-ns-surface-3 focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ns-muted">Up to 10 MB and 500 unique movies per import.</p>
              <Button onClick={createPreview} disabled={!file || busy !== null} loading={busy === 'preview'}>
                {busy === 'preview' ? 'Matching movies…' : 'Preview import'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-up space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <h2 className="break-words font-heading text-xl font-bold text-ns-text">{preview.fileName}</h2>
                <p className="mt-1 text-sm tabular-nums text-ns-muted">
                  {preview.matchedRows} exact · {preview.conflictRows} need review · {preview.unmatchedRows} unmatched
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={startOver}>Choose another file</Button>
            </div>

            <ImportPreview
              items={preview.items}
              choices={choices}
              onChoice={(rowKey, tmdbId) => setChoices(current => ({ ...current, [rowKey]: tmdbId }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ns-border pt-4">
              <p key={selectedCount} className="animate-fade-up text-sm tabular-nums text-ns-muted">{selectedCount} movies selected</p>
              <Button onClick={commitImport} disabled={selectedCount === 0 || busy !== null} loading={busy === 'commit'}>
                {busy === 'commit' ? 'Importing and rebuilding DNA…' : `Import ${selectedCount} movies`}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 animate-fade-up rounded-xl bg-ns-danger/10 px-4 py-3 text-sm text-ns-danger">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="mt-4 animate-fade-up rounded-xl bg-ns-success/10 px-4 py-3">
            <p className="text-sm font-semibold text-ns-success">Imported {success.imported} movies successfully.</p>
            <p className="mt-1 text-sm tabular-nums text-ns-success">
              {success.ratings} ratings · {success.watched} watched · {success.watchlist} watchlist · {success.reviews} reviews
            </p>
            {success.warning && <p className="mt-2 text-sm text-ns-warning">{success.warning}</p>}
          </div>
        )}
      </div>

      {!compact && (
        <section className="ns-reveal">
          <h2 className="font-heading text-xl font-bold text-ns-text">Import history</h2>
          <p className="mt-1 text-base text-ns-muted">Re-importing updates movies with the same TMDb ID instead of creating duplicates.</p>
          <div className="mt-4">
            {history.length === 0 ? (
              <p className="rounded-2xl bg-ns-surface px-6 py-8 text-center text-base text-ns-muted">No previous imports.</p>
            ) : (
              <div className="divide-y divide-ns-border overflow-hidden rounded-2xl bg-ns-surface">
                {history.map(batch => {
                  const expanded = expandedBatch === batch.id
                  return (
                    <div key={batch.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggleHistory(batch.id)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-ns-surface-2 sm:px-6"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 break-all text-base font-semibold text-ns-text">{batch.fileName}</span>
                            <Badge variant={batch.status === 'completed' ? 'success' : 'warning'}>
                              {batch.status === 'completed' ? 'Completed' : 'Preview only'}
                            </Badge>
                          </span>
                          <span className="mt-1 block text-sm text-ns-muted">
                            {new Date(batch.completedAt ?? batch.createdAt).toLocaleDateString()} · {batch.source === 'imdb' ? 'IMDb' : 'Letterboxd'} · Inspect
                          </span>
                        </span>
                        <span className="flex flex-shrink-0 items-center gap-3">
                          <span className="text-right">
                            <span className="block font-display text-lg tabular-nums text-ns-text">{batch.summary?.imported ?? batch.matchedRows}</span>
                            <span className="block text-sm text-ns-muted">movies</span>
                          </span>
                          <ChevronIcon
                            size={16}
                            direction="down"
                            className={`text-ns-muted transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      {expanded && (
                        <div className="animate-fade-up border-t border-ns-border bg-ns-bg px-5 py-3 sm:px-6">
                          {!historyDetails[batch.id] ? (
                            <p className="py-3 text-sm text-ns-muted">Loading import details…</p>
                          ) : historyDetails[batch.id].length === 0 ? (
                            <p className="py-3 text-sm text-ns-muted">No committed movies in this preview.</p>
                          ) : (
                            <div className="max-h-72 divide-y divide-ns-border overflow-y-auto">
                              {historyDetails[batch.id].map(item => (
                                <div key={item.rowKey} className="flex items-center justify-between gap-3 py-2.5">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-ns-text">
                                      {item.matchedTitle ?? item.importedTitle}{item.matchedYear ?? item.importedYear ? ` (${item.matchedYear ?? item.importedYear})` : ''}
                                    </p>
                                    {item.matchedTitle && item.matchedTitle !== item.importedTitle && (
                                      <p className="truncate text-sm text-ns-muted">Imported as “{item.importedTitle}”</p>
                                    )}
                                  </div>
                                  <p className="flex-shrink-0 text-sm tabular-nums text-ns-muted">
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
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
