'use client'

import Badge from '@/components/ui/Badge'
import type { TasteImportPreviewItem } from '@/services/imports/types'

interface Props {
  items: TasteImportPreviewItem[]
  choices: Record<string, number | null>
  onChoice: (rowKey: string, tmdbId: number | null) => void
}

function itemDetails(item: TasteImportPreviewItem): string {
  const details: string[] = []
  if (item.ratingScore !== null) details.push(`${item.ratingScore}/100`)
  if (item.watched) details.push('watched')
  else if (item.watchlist) details.push('watchlist')
  if (item.review) details.push('review')
  return details.join(' · ') || 'movie'
}

export default function ImportPreview({ items, choices, onChoice }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-body text-ns-muted">
          Confirm exact matches and resolve possible matches before importing.
        </p>
        <button
          type="button"
          onClick={() => {
            const shouldSelect = items.some(item => item.candidates.length > 0 && !choices[item.rowKey])
            for (const item of items) {
              if (item.candidates.length > 0) {
                onChoice(item.rowKey, shouldSelect ? item.selectedTmdbId ?? item.candidates[0].tmdbId : null)
              }
            }
          }}
          className="flex-shrink-0 text-xs font-body text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text"
        >
          Select all
        </button>
      </div>

      <div className="max-h-[34rem] overflow-y-auto border-y border-ns-border divide-y divide-ns-border">
        {items.map(item => {
          const choice = choices[item.rowKey] ?? null
          const disabled = item.candidates.length === 0
          return (
            <div key={item.rowKey} className={`py-3 pr-1 sm:py-4 ${disabled ? 'opacity-55' : ''}`}>
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={choice !== null}
                  disabled={disabled}
                  onChange={event => onChoice(
                    item.rowKey,
                    event.target.checked ? item.selectedTmdbId ?? item.candidates[0]?.tmdbId ?? null : null,
                  )}
                  className="mt-1 h-4 w-4 rounded border-ns-border accent-amber-400"
                  aria-label={`Import ${item.title}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-body font-medium text-ns-text truncate">
                      {item.title}{item.year ? ` (${item.year})` : ''}
                    </p>
                    {item.status === 'matched' && (
                      <Badge variant="success">Exact match</Badge>
                    )}
                    {item.status === 'conflict' && (
                      <Badge variant="warning">Review match</Badge>
                    )}
                    {item.status === 'unmatched' && (
                      <Badge variant="danger">No match</Badge>
                    )}
                    {(item.existing.rating || item.existing.watchlist) && (
                      <Badge variant="info">Updates existing</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-body text-ns-muted/70">{itemDetails(item)}</p>

                  {item.candidates.length > 0 && (
                    <select
                      value={choice ?? ''}
                      onChange={event => onChoice(item.rowKey, event.target.value ? Number(event.target.value) : null)}
                      className="mt-2 w-full rounded border border-ns-border bg-ns-surface px-3 py-2 text-xs font-body text-ns-text focus:border-ns-secondary/50 focus:outline-none"
                    >
                      <option value="">Skip this movie</option>
                      {item.candidates.map(candidate => (
                        <option key={candidate.tmdbId} value={candidate.tmdbId}>
                          {candidate.title}{candidate.year ? ` (${candidate.year})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
