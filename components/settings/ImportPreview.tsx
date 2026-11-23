'use client'

import Badge from '@/components/ui/Badge'
import { SelectControl } from './FormControls'
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 basis-56 text-sm text-ns-muted">
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
          className="min-h-11 flex-shrink-0 rounded-full px-4 text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-2 sm:min-h-10"
        >
          Select all
        </button>
      </div>

      <div className="max-h-[34rem] divide-y divide-ns-border overflow-y-auto rounded-2xl bg-ns-bg">
        {items.map(item => {
          const choice = choices[item.rowKey] ?? null
          const disabled = item.candidates.length === 0
          return (
            <div key={item.rowKey} className="p-4">
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={choice !== null}
                  disabled={disabled}
                  onChange={event => onChoice(
                    item.rowKey,
                    event.target.checked ? item.selectedTmdbId ?? item.candidates[0]?.tmdbId ?? null : null,
                  )}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-ns-secondary disabled:cursor-not-allowed"
                  aria-label={`Import ${item.title}`}
                />

                <div className="min-w-0 flex-1">
                  <p className={`break-words text-base font-semibold ${disabled ? 'text-ns-muted' : 'text-ns-text'}`}>
                    {item.title}{item.year ? ` (${item.year})` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.status === 'matched' && <Badge variant="success">Exact match</Badge>}
                    {item.status === 'conflict' && <Badge variant="warning">Review match</Badge>}
                    {item.status === 'unmatched' && <Badge variant="danger">No match</Badge>}
                    {(item.existing.rating || item.existing.watchlist) && <Badge variant="info">Updates existing</Badge>}
                    <span className="text-sm text-ns-muted">{itemDetails(item)}</span>
                  </div>

                  {item.candidates.length > 0 && (
                    <div className="mt-3">
                      <SelectControl
                        aria-label={`Match for ${item.title}`}
                        value={choice ?? ''}
                        onChange={event => onChoice(item.rowKey, event.target.value ? Number(event.target.value) : null)}
                        className="!bg-ns-surface"
                      >
                        <option value="">Skip this movie</option>
                        {item.candidates.map(candidate => (
                          <option key={candidate.tmdbId} value={candidate.tmdbId}>
                            {candidate.title}{candidate.year ? ` (${candidate.year})` : ''}
                          </option>
                        ))}
                      </SelectControl>
                    </div>
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
