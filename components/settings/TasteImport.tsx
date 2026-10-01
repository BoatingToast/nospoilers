'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ImportPreview from './ImportPreview'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
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
    <div className={compact ? '' : 'grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'}>
      <div className="min-w-0 border-t-2 border-ns-text pt-4">
        {!preview ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">Import your movie history</h2>
              <p className="mt-2 max-w-2xl text-sm font-body leading-relaxed text-ns-muted">
                Bring over ratings, watched films, watchlist entries, dates, and reviews. Imported activity will not flood your friends&apos; feeds.
              </p>
              <a
                href="https://www.youtube.com/watch?v=Vj90ijGE6tQ"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-body font-medium text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m10 8 6 4-6 4Z" />
                </svg>
                Watch the import walkthrough
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-body text-ns-muted">Source</span>
                <select
                  value={source}
                  onChange={event => setSource(event.target.value as typeof source)}
                  className="w-full rounded border border-ns-border bg-ns-bg px-3 py-2.5 text-sm font-body text-ns-text focus:border-ns-secondary/50 focus:outline-none"
                >
                  <option value="auto">Detect automatically</option>
                  <option value="letterboxd">Letterboxd</option>
                  <option value="imdb">IMDb</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-body text-ns-muted">CSV or ZIP export</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.zip,text/csv,application/zip"
                  onChange={event => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full min-w-0 cursor-pointer rounded border border-ns-border bg-ns-bg text-sm font-body text-ns-muted file:mr-3 file:border-0 file:border-r file:border-ns-border file:bg-white/5 file:px-4 file:py-2.5 file:text-xs file:font-body file:text-ns-text hover:file:bg-white/10"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-body text-ns-muted">Up to 10 MB and 500 unique movies per import.</p>
              <Button variant="primary" onClick={createPreview} disabled={!file || busy !== null}>
                {busy === 'preview' ? 'Matching movies…' : 'Preview import'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="break-words font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">{preview.fileName}</h2>
                <p className="mt-2 text-sm font-body text-ns-muted">
                  Preview · {preview.matchedRows} exact · {preview.conflictRows} need review · {preview.unmatchedRows} unmatched
                </p>
              </div>
              <button type="button" onClick={startOver} className="min-h-10 text-sm font-body text-ns-muted underline underline-offset-4 hover:text-ns-text">Choose another file</button>
            </div>

            <ImportPreview
              items={preview.items}
              choices={choices}
              onChoice={(rowKey, tmdbId) => setChoices(current => ({ ...current, [rowKey]: tmdbId }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs font-body text-ns-muted">{selectedCount} movies selected</p>
              <Button variant="primary" onClick={commitImport} disabled={selectedCount === 0 || busy !== null}>
                {busy === 'commit' ? 'Importing and rebuilding DNA…' : `Import ${selectedCount} movies`}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 border-l-2 border-rose-500/60 py-1 pl-3 text-sm font-body text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 border-l-2 border-emerald-500/60 py-1 pl-3">
            <p className="text-sm font-body font-medium text-emerald-300">Imported {success.imported} movies successfully.</p>
            <p className="mt-1 text-xs font-body text-emerald-200/70">
              {success.ratings} ratings · {success.watched} watched · {success.watchlist} watchlist · {success.reviews} reviews
            </p>
            {success.warning && <p className="mt-2 text-xs font-body text-amber-200">{success.warning}</p>}
          </div>
        )}
      </div>

      {!compact && (
        <Section
          title="Import history"
          note="Re-importing updates movies with the same TMDb ID instead of creating duplicates."
          className="lg:self-start"
        >
          {history.length === 0 ? (
            <p className="border-t border-ns-border py-4 text-sm font-body text-ns-muted">No previous imports.</p>
          ) : (
            <div className="border-t border-ns-border">
              {history.map(batch => (
                <div key={batch.id} className="border-b border-ns-border">
                  <button
                    type="button"
                    onClick={() => toggleHistory(batch.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left transition-colors hover:text-ns-secondary-readable"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-body font-medium text-ns-text">{batch.fileName}</p>
                        <Badge variant={batch.status === 'completed' ? 'success' : 'warning'}>
                          {batch.status === 'completed' ? 'Completed' : 'Preview only'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-body text-ns-muted">
                        {new Date(batch.completedAt ?? batch.createdAt).toLocaleDateString()} · {batch.source === 'imdb' ? 'IMDb' : 'Letterboxd'} · Inspect
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display leading-none tracking-wider text-ns-text">{batch.summary?.imported ?? batch.matchedRows}</p>
                      <p className="text-[11px] font-body uppercase tracking-wider text-ns-muted">movies {expandedBatch === batch.id ? '↑' : '↓'}</p>
                    </div>
                  </button>

                  {expandedBatch === batch.id && (
                    <div className="border-t border-ns-border pb-3 pl-3">
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
                                  <p className="truncate text-[11px] font-body text-ns-muted/50">Imported as “{item.importedTitle}”</p>
                                )}
                              </div>
                              <p className="flex-shrink-0 text-[11px] font-body text-ns-muted/60">
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
        </Section>
      )}
    </div>
  )
}
