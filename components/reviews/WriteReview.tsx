'use client'

import { useState } from 'react'
import type { ReviewWithMeta } from '@/services/reviews'
import { WarningIcon, SpoilerFreeIcon } from '@/components/icons'
import type { PlotPassportLevel } from '@/lib/plot-passport'

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

  const isEdit = !!existing
  const hasSpoilers = spoilerLevel === 'mid' || spoilerLevel === 'ending'

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
    <div className="rounded-2xl bg-ns-surface border border-ns-border p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-white text-base">
          {isEdit ? 'Edit Your Review' : `Review ${movieTitle}`}
        </h3>
        {onCancel && (
          <button onClick={onCancel} className="text-ns-muted hover:text-white text-sm transition-colors">
            Cancel
          </button>
        )}
      </div>

      {/* Prompt chips — spoiler-free inspiration */}
      {!hasSpoilers && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SPOILER_FREE_PROMPTS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setBody(prev => prev ? `${prev} ${p} ` : `${p} `)}
              className="px-2.5 py-1 rounded-full border border-ns-border text-ns-muted hover:text-white hover:border-white/20 text-[11px] font-body transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">

        {/* Headline */}
        <div>
          <label className="text-xs font-body text-ns-muted mb-1.5 block">
            Headline <span className="text-ns-muted/50">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            placeholder="A compelling one-liner..."
            className="w-full bg-ns-bg border border-ns-border rounded-xl px-4 py-2.5 text-sm font-body text-ns-text placeholder-ns-muted/50 focus:outline-none focus:border-ns-secondary/50 transition-colors"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-body text-ns-muted mb-1.5 block">
            Your Review <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={hasSpoilers
              ? 'Share your full thoughts — mark it as containing spoilers so others can choose to read it...'
              : 'Share your experience without revealing plot details. Talk about acting, visuals, emotion, atmosphere...'
            }
            className="w-full bg-ns-bg border border-ns-border rounded-xl px-4 py-3 text-sm font-body text-ns-text placeholder-ns-muted/50 focus:outline-none focus:border-ns-secondary/50 transition-colors resize-y leading-relaxed"
          />
          <p className="text-[10px] font-body text-ns-muted/50 mt-1 text-right">
            {body.length}/4000
          </p>
        </div>

        {/* Rating + spoiler row */}
        <div className="flex flex-wrap items-center gap-4">

          {/* Rating */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-body text-ns-muted whitespace-nowrap">
              Rating <span className="text-ns-muted/50">(optional)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1} max={100}
                value={rating}
                onChange={e => setRating(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="—"
                className="w-16 bg-ns-bg border border-ns-border rounded-lg px-2 py-1.5 text-sm font-body text-center text-ns-text focus:outline-none focus:border-ns-secondary/50 transition-colors"
              />
              <span className="text-ns-muted text-xs font-body">/100</span>
            </div>
          </div>

          {/* Plot Passport boundary */}
          <label className="flex items-center gap-2.5 ml-auto">
            <span className="text-xs font-body text-ns-muted whitespace-nowrap">Safe to show</span>
            <select
              value={spoilerLevel}
              onChange={e => setSpoilerLevel(e.target.value as PlotPassportLevel | 'auto')}
              className="bg-ns-bg border border-ns-border rounded-lg px-2.5 py-1.5 text-xs font-body text-ns-text focus:outline-none focus:border-ns-secondary/50"
            >
              <option value="auto">Auto-detect</option>
              <option value="safe">For everyone</option>
              <option value="mid">After halfway</option>
              <option value="ending">After finishing</option>
            </select>
          </label>
        </div>

        {/* Plot Passport notice */}
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${
          spoilerLevel === 'safe'
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-amber-500/8 border-amber-500/20'
        }`}>
          {spoilerLevel === 'safe'
            ? <SpoilerFreeIcon size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <WarningIcon size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />}
          <p className={`text-xs font-body leading-relaxed ${
            spoilerLevel === 'safe' ? 'text-emerald-300/80' : 'text-amber-300/80'
          }`}>
            {spoilerLevel === 'auto'
              ? 'Plot Passport will detect the earliest safe viewing point from your review and lock it for viewers who are not there yet.'
              : spoilerLevel === 'safe'
                ? 'Everyone can read this review, including people who have not started the movie.'
                : spoilerLevel === 'mid'
                  ? 'This review unlocks automatically when a viewer reaches 50%.'
                  : 'This review unlocks automatically only after a viewer finishes the movie.'}
          </p>
        </div>

        {error && (
          <p className="text-rose-400 text-sm font-body">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-start px-6 py-2.5 rounded-xl bg-ns-secondary text-ns-secondary-foreground text-sm font-heading font-semibold
                     hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Review'}
        </button>
      </form>
    </div>
  )
}
