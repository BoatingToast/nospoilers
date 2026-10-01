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
    genreIds:    number[]
    runtime:     number | null
    voteAverage: number
    voteCount:   number
    popularity:  number
    originalLanguage: string
    budget:      number
    keywords:    string[]
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
          ...movie,
          score,         // always the user's chosen value
          review:      review.trim() || null,
          ...subs,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-ns-bg border border-ns-border border-t-2 border-t-ns-text rounded
                      overflow-hidden max-h-[92vh] flex flex-col">

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-7">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-3xl tracking-wide text-ns-text leading-none">
                {movie.title.toUpperCase()}
              </h2>
              <p className="text-ns-muted text-sm font-body mt-2">
                Detailed Rating
              </p>
            </div>
            <button onClick={onClose} className="-mr-2 -mt-2 flex h-10 w-10 flex-shrink-0 items-center justify-center text-ns-muted hover:text-ns-text transition-colors">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── Section 1: Overall Rating ── */}
          <div className="border-t border-ns-border pt-4">
            <p className="text-ns-text text-sm font-heading font-semibold mb-4">
              Overall Rating
            </p>
            <div className="flex flex-col items-center gap-1">
              <ScoreDial value={score} onChange={setScore} size={160} />
              <p className="text-ns-muted text-xs font-body text-center mt-1">
                Your final verdict — 1 to 100
              </p>
            </div>
          </div>

          {/* ── Section 2: Advanced Preferences ── */}
          <div className="border-t border-ns-border pt-4">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-ns-text text-sm font-heading font-semibold">
                Advanced Preferences
              </p>
              <span className="text-ns-muted text-xs font-body">Optional</span>
            </div>
            <p className="text-ns-muted text-xs font-body mb-4 leading-relaxed">
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
          <div className="space-y-2 border-t border-ns-border pt-4">
            <p className="text-ns-text text-sm font-heading font-semibold">
              Notes <span className="text-xs font-body font-normal text-ns-muted">(optional)</span>
            </p>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={3}
              placeholder="What stood out? What didn't work?"
              maxLength={500}
              className="w-full bg-ns-surface border border-ns-border rounded px-3 py-2.5
                         text-ns-text text-sm font-body placeholder:text-ns-muted/40 resize-none
                         focus:outline-none focus:border-ns-secondary/40 transition-colors"
            />
            <p className="text-ns-muted text-[11px] font-body text-right">
              {review.length}/500
            </p>
          </div>

          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 p-4 border-t border-ns-border bg-ns-bg">
          <div className="flex gap-3">
            {existing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-3 rounded border border-red-500/30 text-red-400/70
                           font-body text-sm hover:text-red-400 hover:border-red-500/50
                           transition-colors disabled:opacity-50"
              >
                {deleting ? '…' : 'Remove'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded bg-ns-secondary text-ns-secondary-foreground font-heading font-semibold
                         text-sm hover:bg-ns-text hover:text-ns-bg disabled:opacity-50
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
