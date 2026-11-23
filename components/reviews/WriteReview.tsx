'use client'

import { useId, useState } from 'react'
import type { ReviewWithMeta } from '@/services/reviews'
import { WarningIcon, SpoilerFreeIcon } from '@/components/icons'
import type { PlotPassportLevel } from '@/lib/plot-passport'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Props {
  tmdbId:     number
  movieTitle: string
  existing:   ReviewWithMeta | null
  onSaved:    (review: ReviewWithMeta) => void
  onCancel?:  () => void
}

const SPOILER_FREE_PROMPTS = [
  'How did it make you feel?',
  'What stood out about the performances?',
  'Describe the atmosphere and tone.',
  'How was the pacing and direction?',
  'What made it memorable (or forgettable)?',
]

export default function WriteReview({ tmdbId, movieTitle, existing, onSaved, onCancel }: Props) {
  const [title,       setTitle]       = useState(existing?.title ?? '')
  const [body,        setBody]        = useState(existing?.body ?? '')
  const [rating,      setRating]      = useState<number | ''>(existing?.rating ?? '')
  const [spoilerLevel, setSpoilerLevel] = useState<PlotPassportLevel | 'auto'>(
    existing?.spoilerLevel ?? 'auto',
  )
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const fieldId = useId()

  const isEdit = !!existing
  const hasSpoilers = spoilerLevel === 'mid' || spoilerLevel === 'ending'
  const errorId = `${fieldId}-error`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) { setError('Review body is required'); return }
    setSaving(true)
    setError('')

    const payload = {
      tmdbId,
      movieTitle,
      title:       title.trim() || undefined,
      review:      body.trim(),
      rating:      rating !== '' ? Number(rating) : undefined,
      hasSpoilers,
      spoilerLevel,
    }

    try {
      const url    = isEdit ? `/api/reviews/${existing.id}` : '/api/reviews'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong')
        return
      }

      // Refetch stats + updated review for parent
      const statsRes = await fetch(`/api/reviews/stats?tmdbId=${tmdbId}`)
      const statsData = await statsRes.json()

      onSaved({
        ...(existing ?? {
          id: '', userId: '', username: '', tmdbId, movieTitle,
          upvotes: 0, downvotes: 0, helpfulCount: 0, replyCount: 0,
          isFriend: false, viewerVotes: [], createdAt: new Date().toISOString(),
          spoilerLevel: 'safe', viewerUnlocked: true, unlockAtProgress: 0, viewerProgress: 100,
        }),
        ...payload,
        title:   payload.title ?? null,
        rating:  payload.rating ?? null,
        updatedAt: new Date().toISOString(),
        ...statsData.userReview,
      } as ReviewWithMeta)
    } catch {
      setError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-up rounded-2xl bg-ns-surface p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="min-w-0 break-words font-heading text-xl font-bold text-ns-text">
          {isEdit ? 'Edit your review' : `Review ${movieTitle}`}
        </h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
            Cancel
          </Button>
        )}
      </div>

      {/* Prompt chips — spoiler-free inspiration */}
      {!hasSpoilers && (
        <div className="scrollbar-hide -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {SPOILER_FREE_PROMPTS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setBody(prev => prev ? `${prev} ${p} ` : `${p} `)}
              className="min-h-10 flex-shrink-0 rounded-full bg-ns-surface-2 px-3.5 text-sm text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input
          id={`${fieldId}-headline`}
          label="Headline (optional)"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={120}
          placeholder="A compelling one-liner..."
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${fieldId}-body`} className="text-sm font-semibold text-ns-text">
            Your review <span className="text-ns-danger" aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${fieldId}-body`}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            maxLength={4000}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder={hasSpoilers
              ? 'Share your full thoughts — mark it as containing spoilers so others can choose to read it...'
              : 'Share your experience without revealing plot details. Talk about acting, visuals, emotion, atmosphere...'
            }
            className="w-full resize-y rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base leading-relaxed text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
          />
          <p className="text-right text-xs tabular-nums text-ns-muted">{body.length}/4000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id={`${fieldId}-rating`}
            label="Rating (optional)"
            type="number"
            min={1}
            max={100}
            value={rating}
            onChange={e => setRating(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="—"
            endAdornment={<span className="pr-2 text-sm text-ns-muted">/100</span>}
          />

          {/* Plot Passport boundary */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${fieldId}-level`} className="text-sm font-semibold text-ns-text">Safe to show</label>
            <select
              id={`${fieldId}-level`}
              value={spoilerLevel}
              onChange={e => setSpoilerLevel(e.target.value as PlotPassportLevel | 'auto')}
              className="min-h-12 w-full rounded-xl border border-ns-border-strong bg-ns-bg px-3.5 text-base text-ns-text transition-colors duration-150 focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
            >
              <option value="auto">Auto-detect</option>
              <option value="safe">For everyone</option>
              <option value="mid">After halfway</option>
              <option value="ending">After finishing</option>
            </select>
          </div>
        </div>

        {/* Plot Passport notice */}
        <div
          key={spoilerLevel}
          className={`flex animate-fade-up items-start gap-2.5 rounded-xl p-4 ${
            spoilerLevel === 'safe' ? 'bg-ns-success/10' : 'bg-ns-warning/10'
          }`}
        >
          {spoilerLevel === 'safe'
            ? <SpoilerFreeIcon size={16} className="mt-0.5 flex-shrink-0 text-ns-success" />
            : <WarningIcon size={16} className="mt-0.5 flex-shrink-0 text-ns-warning" />}
          <p className={`text-sm leading-relaxed ${spoilerLevel === 'safe' ? 'text-ns-success' : 'text-ns-warning'}`}>
            {spoilerLevel === 'auto'
              ? 'Plot Passport will detect the earliest safe viewing point from your review and lock it for viewers who are not there yet.'
              : spoilerLevel === 'safe'
                ? 'Everyone can read this review, including people who have not started the movie.'
                : spoilerLevel === 'mid'
                  ? 'This review unlocks automatically when a viewer reaches 50%.'
                  : 'This review unlocks automatically only after a viewer finishes the movie.'}
          </p>
        </div>

        {error && <p id={errorId} role="alert" className="text-sm text-ns-danger">{error}</p>}

        <Button type="submit" disabled={!body.trim()} loading={saving} className="w-full sm:w-auto sm:self-start">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish review'}
        </Button>
      </form>
    </div>
  )
}
