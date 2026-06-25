'use client'

import { useState } from 'react'
import ScoreDial from './ScoreDial'
import SubRatingSlider from './SubRatingSlider'
import type { MovieRatingData } from '@/types'
import {
  ReviewsIcon,
  FriendsIcon,
  FilmIcon,
  EmotionIcon,
  ComplexityIcon,
  SuspenseIcon,
  type IconProps,
} from '@/components/icons'

interface Props {
  movie: {
    tmdbId:      number
    title:       string
    posterPath:  string | null
    releaseDate: string | null
  }
  existing:  MovieRatingData | null
  onSaved:   (rating: MovieRatingData) => void
  onDeleted: () => void
  onClose:   () => void
}

const SUB_DIMENSIONS: { key: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { key: 'storytelling',  label: 'Storytelling',  Icon: ReviewsIcon    },
  { key: 'characters',    label: 'Characters',    Icon: FriendsIcon    },
  { key: 'entertainment', label: 'Entertainment', Icon: FilmIcon       },
  { key: 'emotion',       label: 'Emotion',       Icon: EmotionIcon    },
  { key: 'complexity',    label: 'Complexity',    Icon: ComplexityIcon },
  { key: 'suspense',      label: 'Suspense',      Icon: SuspenseIcon   },
]

type SubKey = string

export default function DetailedRatingModal({
  movie, existing, onSaved, onDeleted, onClose,
}: Props) {
  // Overall rating is fully independent — never touched by sub-ratings
  const [score,    setScore]    = useState(existing?.score ?? 70)
  const [review,   setReview]   = useState(existing?.review ?? '')
  const [subs, setSubs] = useState<Record<SubKey, number | null>>({
    storytelling:  existing?.storytelling  ?? null,
    characters:    existing?.characters    ?? null,
    entertainment: existing?.entertainment ?? null,
    emotion:       existing?.emotion       ?? null,
    complexity:    existing?.complexity    ?? null,
    suspense:      existing?.suspense      ?? null,
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function setSub(key: SubKey, value: number | null) {
    // Sub-ratings are metadata only — score is never recalculated
    setSubs(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/ratings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId:      movie.tmdbId,
          title:       movie.title,
          posterPath:  movie.posterPath,
          releaseDate: movie.releaseDate,
          score,         // always the user's chosen value
          review:      review.trim() || null,
          ...subs,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      onSaved(data.rating)
    } catch {
      setError('Could not save. Try again.')
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
      setError('Could not delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-ns-bg border border-ns-border rounded-2xl
                      shadow-2xl shadow-black/80 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Gold strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-ns-gold/0 via-ns-gold to-ns-gold/0 flex-shrink-0" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-7">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-ns-gold text-[10px] tracking-widest uppercase font-body mb-1">
                Detailed Rating
              </p>
              <h2 className="font-display text-2xl tracking-wider text-ns-text leading-tight">
                {movie.title.toUpperCase()}
              </h2>
            </div>
            <button onClick={onClose} className="text-ns-muted hover:text-ns-text transition-colors mt-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── Section 1: Overall Rating ── */}
          <div>
            <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">
              Overall Rating
            </p>
            <div className="flex flex-col items-center gap-1">
              <ScoreDial value={score} onChange={setScore} size={160} />
              <p className="text-ns-muted/60 text-[11px] font-body text-center mt-1">
                Your final verdict — 1 to 100
              </p>
            </div>
          </div>

          {/* ── Section 2: Advanced Preferences ── */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-ns-muted text-xs tracking-widest uppercase font-body">
                Advanced Preferences
              </p>
              <span className="text-ns-muted/50 text-[10px] font-body normal-case">Optional</span>
            </div>
            <p className="text-ns-muted/70 text-[11px] font-body mb-4 leading-relaxed">
              These dimensions help us understand <em>why</em> you liked a movie.
              They do not affect your overall rating.
            </p>
            <div className="space-y-4">
              {SUB_DIMENSIONS.map(dim => (
                <SubRatingSlider
                  key={dim.key}
                  label={dim.label}
                  Icon={dim.Icon}
                  value={subs[dim.key]}
                  onChange={v => setSub(dim.key, v)}
                />
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="space-y-2">
            <p className="text-ns-muted text-xs tracking-widest uppercase font-body">
              Notes <span className="normal-case text-[10px]">(optional)</span>
            </p>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={3}
              placeholder="What stood out? What didn't work?"
              maxLength={500}
              className="w-full bg-ns-surface border border-ns-border rounded-xl px-3 py-2.5
                         text-ns-text text-sm font-body placeholder:text-ns-muted/40 resize-none
                         focus:outline-none focus:border-ns-gold/40 transition-colors"
            />
            <p className="text-ns-muted/40 text-[10px] font-body text-right">
              {review.length}/500
            </p>
          </div>

          {error && <p className="text-red-400 text-xs font-body text-center">{error}</p>}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 p-4 pt-0 border-t border-ns-border bg-ns-bg">
          <div className="flex gap-3">
            {existing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-3 rounded-xl border border-red-500/30 text-red-400/70
                           font-body text-sm hover:text-red-400 hover:border-red-500/50
                           transition-colors disabled:opacity-50"
              >
                {deleting ? '…' : 'Remove'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-ns-gold text-ns-bg font-body font-semibold
                         text-sm tracking-wide hover:bg-amber-400 disabled:opacity-50
                         transition-colors"
            >
              {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
