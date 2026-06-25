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
          tmdbId:      movie.tmdbId,
          title:       movie.title,
          posterPath:  movie.posterPath,
          releaseDate: movie.releaseDate,
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
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      onSaved(data.rating)
    } catch {
      setError('Could not save rating. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/ratings/${movie.tmdbId}`, { method: 'DELETE' })
      onDeleted()
    } catch {
      setError('Could not delete rating.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-ns-bg border border-ns-border rounded-2xl
                      shadow-2xl shadow-black/80 overflow-hidden">
        {/* Gold top strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-ns-gold/0 via-ns-gold to-ns-gold/0" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-ns-gold text-[10px] tracking-widest uppercase font-body mb-1">
                Rate this film
              </p>
              <h2 className="font-display text-2xl tracking-wider text-ns-text leading-tight">
                {movie.title.toUpperCase()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-ns-muted hover:text-ns-text transition-colors mt-1"
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
          <p className="text-ns-muted/60 text-[11px] font-body text-center mb-6">
            Your overall rating — 1 to 100
          </p>

          {error && (
            <p className="text-red-400 text-xs font-body text-center mb-4">{error}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-ns-gold text-ns-bg font-body font-semibold
                         text-sm tracking-wide hover:bg-amber-400 disabled:opacity-50
                         transition-colors"
            >
              {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
            </button>

            <button
              onClick={onGoDetailed}
              className="w-full py-2.5 rounded-xl border border-ns-border text-ns-muted
                         font-body text-sm hover:text-ns-text hover:border-ns-border/60
                         transition-colors"
            >
              Add Dimension Ratings →
            </button>

            {existing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-2 text-red-400/70 font-body text-xs hover:text-red-400
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
