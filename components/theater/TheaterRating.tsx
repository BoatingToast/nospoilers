'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import { AUDIENCE_REACTIONS, PACING_SIGNALS, pacingLabel, reactionLabel, type AudienceReaction, type PacingSignal } from '@/lib/audience-lab'
import { fieldClass, labelClass, theaterRequest } from './TheaterShared'

const choiceClass = (active: boolean) => [
  'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150',
  active ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text',
].join(' ')

export default function TheaterRating({ id, title, onRated }: { id: string; title: string; onRated: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [rating, setRating] = useState(0)
  const [recommendScore, setRecommendScore] = useState<number | null>(null)
  const [pacing, setPacing] = useState<PacingSignal | null>(null)
  const [reactions, setReactions] = useState<AudienceReaction[]>([])
  const [standoutMoment, setStandoutMoment] = useState('')
  const [improvement, setImprovement] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])

  function toggleReaction(reaction: AudienceReaction) {
    setReactions(current => current.includes(reaction)
      ? current.filter(value => value !== reaction)
      : current.length < 3 ? [...current, reaction] : current)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rating || saving) return
    setSaving(true); setError('')
    try {
      await theaterRequest(`/api/theater/${id}`, {
        action: 'feedback', rating, recommendScore, pacing, reactions, standoutMoment, improvement,
      })
      await onRated()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save your feedback.')
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="m-auto max-h-[calc(100svh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-ns-surface p-6 text-ns-text shadow-2xl backdrop:bg-black/80 sm:p-10"
      aria-labelledby="theater-rating-title"
      aria-describedby="theater-rating-description"
      onCancel={event => event.preventDefault()}
    >
      <form onSubmit={submit}>
        <div className="text-center">
          <h2 id="theater-rating-title" className="font-display text-3xl text-ns-text sm:text-4xl">Help shape the next cut.</h2>
          <p className="mt-2 break-words text-base font-semibold text-ns-secondary-readable">{title}</p>
          <p id="theater-rating-description" className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ns-muted">
            Your response is anonymous in the filmmaker’s report. The overall rating is required; every other signal is optional.
          </p>
        </div>

        <fieldset className="mt-7">
          <legend className="mx-auto mb-3 text-center text-sm font-semibold text-ns-text">Overall response <span className="font-normal text-ns-muted">· required</span></legend>
          <div className="flex justify-center gap-1 sm:gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <label key={star} className="relative cursor-pointer">
                <input
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  type="radio"
                  name="premiere-rating"
                  value={star}
                  checked={rating === star}
                  onChange={() => setRating(star)}
                  aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                />
                <span
                  aria-hidden="true"
                  style={{ transitionDelay: rating >= star ? `${(star - 1) * 35}ms` : '0ms' }}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-[color,transform] duration-200 ease-[var(--ns-ease-snap)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ns-text ${rating >= star ? 'scale-110 text-ns-accent' : 'text-ns-subtle hover:text-ns-secondary-readable'}`}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill={rating >= star ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                    <path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.1 6.4 20.1l1.2-6.2L3 9.6l6.3-.8z" />
                  </svg>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 space-y-6 border-t border-ns-border pt-6">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ns-text">Would you recommend it? <span className="font-normal text-ns-muted">0–10</span></legend>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
              {Array.from({ length: 11 }, (_, score) => (
                <button
                  type="button"
                  key={score}
                  aria-pressed={recommendScore === score}
                  onClick={() => setRecommendScore(recommendScore === score ? null : score)}
                  className={`min-h-11 rounded-full text-sm font-semibold tabular-nums transition-colors duration-150 ${recommendScore === score ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'}`}
                >
                  {score}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ns-text">How did the pacing feel?</legend>
            <div className="flex flex-wrap gap-2">
              {PACING_SIGNALS.map(value => (
                <button type="button" key={value} aria-pressed={pacing === value} onClick={() => setPacing(pacing === value ? null : value)} className={choiceClass(pacing === value)}>
                  {pacingLabel(value)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ns-text">What did you feel? <span className="font-normal text-ns-muted">Choose up to 3</span></legend>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_REACTIONS.map(reaction => (
                <button type="button" key={reaction} aria-pressed={reactions.includes(reaction)} onClick={() => toggleReaction(reaction)} className={choiceClass(reactions.includes(reaction))}>
                  {reactionLabel(reaction)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              What stayed with you?
              <textarea className={fieldClass} rows={3} maxLength={600} value={standoutMoment} onChange={event => setStandoutMoment(event.target.value)} placeholder="A moment, character, image…" />
            </label>
            <label className={labelClass}>
              What would make it stronger?
              <textarea className={fieldClass} rows={3} maxLength={600} value={improvement} onChange={event => setImprovement(event.target.value)} placeholder="One honest, useful note…" />
            </label>
          </div>
        </div>

        {error && <p role="alert" className="mt-5 animate-fade-up text-center text-sm text-ns-danger motion-reduce:animate-none">{error}</p>}
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex flex-col gap-3 border-t border-ns-border bg-ns-surface px-6 py-4 sm:-bottom-10 sm:-mx-10 sm:-mb-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-sm text-ns-muted">+25 Audience XP for completing this response</p>
          <Button type="submit" size="lg" disabled={!rating || saving}>{saving ? 'Sending feedback…' : 'Send private feedback'}</Button>
        </div>
      </form>
    </dialog>
  )
}
