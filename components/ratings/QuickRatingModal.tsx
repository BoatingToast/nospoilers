'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
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
    <Modal onClose={onClose} ariaLabelledBy="quick-rating-title" maxWidth="max-w-sm">
      <div className="p-6">
        <div className="mb-5 pr-12">
          <h2 id="quick-rating-title" className="break-words font-display text-2xl text-ns-text">{movie.title}</h2>
          <p className="mt-1 text-sm text-ns-muted">Rate this film</p>
        </div>

        <div className="flex justify-center">
          <ScoreDial value={score} onChange={setScore} size={180} />
        </div>
        <p className="mb-5 mt-3 text-center text-sm text-ns-muted">Your overall rating, 1 to 100</p>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-ns-danger/10 px-3 py-2 text-center text-sm text-ns-danger">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={handleSave} loading={saving} className="w-full">
            {saving ? 'Saving…' : existing ? 'Update Rating' : 'Save Rating'}
          </Button>
          <Button variant="outline" onClick={onGoDetailed} className="w-full">
            Add dimension ratings
          </Button>
          {existing && (
            <Button variant="ghost" onClick={handleDelete} loading={deleting} className="w-full text-ns-danger hover:bg-ns-danger/10">
              {deleting ? 'Removing…' : 'Remove rating'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
