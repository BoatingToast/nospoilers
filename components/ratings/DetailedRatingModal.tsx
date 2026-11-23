'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
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
  { key: 'storytelling', label: 'Storytelling',  Icon: ReviewsIcon    },
  { key: 'characters', label: 'Characters',    Icon: FriendsIcon    },
  { key: 'entertainment', label: 'Entertainment', Icon: FilmIcon       },
  { key: 'emotion', label: 'Emotion',       Icon: EmotionIcon    },
  { key: 'complexity', label: 'Complexity',    Icon: ComplexityIcon },
  { key: 'suspense', label: 'Suspense',      Icon: SuspenseIcon   },
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
    <Modal onClose={onClose} ariaLabelledBy="detailed-rating-title" maxWidth="max-w-lg">
      <div className="space-y-8 p-6 sm:p-8">
        <div className="pr-12">
          <h2 id="detailed-rating-title" className="break-words font-display text-3xl text-ns-text">{movie.title}</h2>
          <p className="mt-1 text-sm text-ns-muted">Detailed rating</p>
        </div>

        <section aria-labelledby="detailed-overall">
          <h3 id="detailed-overall" className="sr-only">Overall rating</h3>
          <div className="flex flex-col items-center gap-1">
            <ScoreDial value={score} onChange={setScore} size={160} />
            <p className="mt-2 text-center text-sm text-ns-muted">Your final verdict, 1 to 100</p>
          </div>
        </section>

        <section aria-labelledby="detailed-preferences">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="detailed-preferences" className="font-heading text-lg font-bold text-ns-text">Advanced preferences</h3>
            <span className="text-sm text-ns-muted">Optional</span>
          </div>
          <p className="mb-3 mt-1 text-sm leading-relaxed text-ns-muted">
            These dimensions help us understand <em>why</em> you liked a movie.
            They do not affect your overall rating.
          </p>
          <div className="divide-y divide-ns-border">
            {SUB_DIMENSIONS.map(dim => (
              <div key={dim.key} className="py-1">
                <SubRatingSlider
                  label={dim.label}
                  Icon={dim.Icon}
                  value={subs[dim.key]}
                  onChange={v => setSub(dim.key, v)}
                />
              </div>
            ))}
          </div>
        </section>

        <div>
          <label htmlFor="rating-notes" className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ns-text">
            Notes <span className="font-normal text-ns-muted">Optional</span>
          </label>
          <textarea
            id="rating-notes"
            value={review}
            onChange={e => setReview(e.target.value)}
            rows={3}
            placeholder="What stood out? What didn't work?"
            maxLength={500}
            className="mt-2 w-full resize-none rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-ns-muted">{review.length}/500</p>
        </div>

        {error && <p role="alert" className="rounded-xl bg-ns-danger/10 px-3 py-2 text-center text-sm text-ns-danger">{error}</p>}
      </div>

      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-ns-border bg-ns-surface p-4">
        {existing && (
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        )}
        <Button onClick={handleSave} loading={saving} className="flex-1">
          {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
        </Button>
      </div>
    </Modal>
  )
}
