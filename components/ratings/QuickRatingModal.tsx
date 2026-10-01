'use client'

import { useState } from 'react'
import ScoreDial from './ScoreDial'
import type { MovieRatingData } from '@/types'

interface Props {
  movie: {
    tmdbId:      number
    title:       string
    posterPath:  string | null
    releaseDate: string | null
    genreIds:    number[]
    runtime:     number | null
    voteAverage: number
    voteCount:   number
    popularity:  number
    originalLanguage: string
    budget:      number
    keywords:    string[]
  }
  existing:     MovieRatingData | null
  onSaved:      (rating: MovieRatingData) => void
  onDeleted:    () => void
  onClose:      () => void
  onGoDetailed: () => void
}

export default function QuickRatingModal({
  movie, existing, onSaved, onDeleted, onClose, onGoDetailed
}: Props) {
  const [score,    setScore]    = useState(existing?.score ?? 70)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/ratings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...movie,
          score,
          // Preserve existing sub-ratings if user is just updating the overall score
          storytelling:  existing?.storytelling  ?? null,
          characters:    existing?.characters    ?? null,
          entertainment: existing?.entertainment ?? null,
          emotion:       existing?.emotion       ?? null,
          complexity:    existing?.complexity    ?? null,
          suspense:      existing?.suspense      ?? null,
          review:        existing?.review        ?? null,
        }),
      })

      if (!res.ok) {
        let message = 'Could not save rating. Please try again.'
        try {
          const errorData = await res.json()
          if (typeof errorData?.error === 'string' && errorData.error) {
            message = `Could not save rating. ${errorData.error}`
          }
          if (res.status === 401) message = 'Please sign in to save ratings.'
        } catch {
          message = 'Could not save rating. Please try again.'
        }
        throw new Error(message)
      }

      const data = await res.json()
      onSaved(data.rating)
    } catch (error) {
      if (error instanceof Error) setError(error.message)
      else setError('Could not save rating. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/ratings/${movie.tmdbId}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const message = typeof errorData?.error === 'string' && errorData.error
          ? `Could not delete rating. ${errorData.error}`
          : 'Could not delete rating. Please try again.'
        throw new Error(message)
      }
      onDeleted()
    } catch (error) {
      if (error instanceof Error) setError(error.message)
      else setError('Could not delete rating. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-ns-bg border border-ns-border border-t-2 border-t-ns-text rounded
                      overflow-hidden">

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h2 className="font-display text-3xl tracking-wide text-ns-text leading-none">
                {movie.title.toUpperCase()}
              </h2>
              <p className="text-ns-muted text-sm font-body mt-2">
                Rate this film
              </p>
            </div>
            <button
              onClick={onClose}
              className="-mr-2 -mt-2 flex h-10 w-10 flex-shrink-0 items-center justify-center text-ns-muted hover:text-ns-text transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Dial */}
          <div className="flex justify-center mb-2">
            <ScoreDial value={score} onChange={setScore} size={180} />
          </div>
          <p className="text-ns-muted text-xs font-body text-center mb-6">
            Your overall rating — 1 to 100
          </p>

          {error && (
            <p className="text-red-400 text-xs font-body mb-4">{error}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded bg-ns-secondary text-ns-secondary-foreground font-heading font-semibold
                         text-sm hover:bg-ns-text hover:text-ns-bg disabled:opacity-50
                         transition-colors"
            >
              {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
            </button>

            <button
              onClick={onGoDetailed}
              className="w-full py-2.5 rounded border border-ns-border text-ns-text
                         font-heading text-sm hover:border-ns-text
                         transition-colors"
            >
              Add Dimension Ratings →
            </button>

            {existing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full min-h-10 py-2 text-red-400/70 font-body text-xs underline underline-offset-4 hover:text-red-400
                           transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove rating'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
