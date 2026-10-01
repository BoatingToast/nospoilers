'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AUDIENCE_REACTIONS, PACING_SIGNALS, pacingLabel, reactionLabel, type AudienceReaction, type PacingSignal } from '@/lib/audience-lab'
import { theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

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

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="theater-rating-title" aria-describedby="theater-rating-description" onCancel={e => e.preventDefault()}>
    <form onSubmit={submit}>
      <div className="text-center"><p className={styles.eyebrow}>Audience Lab · Private filmmaker feedback</p><div className="mx-auto mb-4 mt-5 text-3xl text-[#ddbd86]" aria-hidden="true">✧</div><h2 id="theater-rating-title" className={`${styles.title} text-4xl`}>Help shape the next cut.</h2><p className="mt-3 break-words text-sm text-white/70">{title}</p><p id="theater-rating-description" className="mx-auto mt-3 max-w-lg text-xs leading-6 text-white/45">Your response is anonymous in the filmmaker’s report. The overall rating is required; every other signal is optional.</p></div>

      <fieldset className="mt-6"><legend className="mb-2 text-center text-xs text-white/65">Overall response <span className="text-[#ddbd86]">· required</span></legend><div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map(star => <label key={star} className="relative cursor-pointer"><input className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name="premiere-rating" value={star} checked={rating === star} onChange={() => setRating(star)} aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`} /><span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-lg text-3xl transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#ddbd86] ${rating >= star ? 'text-[#ddbd86]' : 'text-white/20 hover:text-[#ddbd86]/60'}`}>★</span></label>)}</div></fieldset>

      <div className="mt-6 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2">
        <fieldset><legend className="mb-3 text-xs text-white/65">Would you recommend it? <span className="text-white/30">0–10</span></legend><div className="grid grid-cols-6 gap-1.5">{Array.from({ length: 11 }, (_, score) => <button type="button" key={score} aria-pressed={recommendScore === score} onClick={() => setRecommendScore(recommendScore === score ? null : score)} className={`min-h-9 rounded-md border text-[11px] ${recommendScore === score ? 'border-[#ddbd86] bg-[#ddbd86] text-[#211a12]' : 'border-white/10 text-white/55 hover:border-[#ddbd86]/50'}`}>{score}</button>)}</div></fieldset>
        <fieldset><legend className="mb-3 text-xs text-white/65">How did the pacing feel?</legend><div className="grid gap-2">{PACING_SIGNALS.map(value => <button type="button" key={value} aria-pressed={pacing === value} onClick={() => setPacing(pacing === value ? null : value)} className={`min-h-9 rounded-md border px-3 text-left text-[11px] ${pacing === value ? 'border-[#ddbd86] bg-[#ddbd86]/10 text-[#ddbd86]' : 'border-white/10 text-white/55'}`}>{pacingLabel(value)}</button>)}</div></fieldset>
      </div>

      <fieldset className="mt-5"><legend className="mb-3 text-xs text-white/65">What did you feel? <span className="text-white/30">Choose up to 3</span></legend><div className="flex flex-wrap gap-2">{AUDIENCE_REACTIONS.map(reaction => <button type="button" key={reaction} aria-pressed={reactions.includes(reaction)} onClick={() => toggleReaction(reaction)} className={`min-h-9 rounded-full border px-3 text-[11px] ${reactions.includes(reaction) ? 'border-[#ddbd86] bg-[#ddbd86]/10 text-[#ddbd86]' : 'border-white/10 text-white/55'}`}>{reactionLabel(reaction)}</button>)}</div></fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className={styles.field}>What stayed with you?<textarea className={styles.input} rows={3} maxLength={600} value={standoutMoment} onChange={event => setStandoutMoment(event.target.value)} placeholder="A moment, character, image…" /></label><label className={styles.field}>What would make it stronger?<textarea className={styles.input} rows={3} maxLength={600} value={improvement} onChange={event => setImprovement(event.target.value)} placeholder="One honest, useful note…" /></label></div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><p className="text-[11px] text-[#ddbd86]">+25 Audience XP for completing this response</p><button className={styles.button} disabled={!rating || saving}>{saving ? 'Sending feedback…' : 'Send private feedback'}</button></div>
      {error && <p role="alert" className="mt-4 text-center text-xs text-rose-200">{error}</p>}
    </form>
  </dialog>
}
