'use client'

import { useEffect, useRef, useState } from 'react'
import { theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

export default function TheaterRating({ id, title, onRated }: { id: string; title: string; onRated: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [rating, setRating] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="theater-rating-title" aria-describedby="theater-rating-description" onCancel={e => e.preventDefault()}>
    <div className="text-center"><p className={styles.eyebrow}>The credits rolled. Your voice matters.</p><div className="mx-auto mb-5 mt-7 text-4xl text-[#ddbd86]" aria-hidden="true">✧</div><h2 id="theater-rating-title" className={`${styles.title} text-4xl`}>How was the show?</h2><p className="mt-3 break-words text-sm text-white/70">{title}</p><p id="theater-rating-description" className="mt-4 text-xs leading-6 text-white/45">Every first audience helps a filmmaker grow. Choose a rating to complete your premiere and return to Theater.</p>
      <fieldset className="mt-7"><legend className="sr-only">Required premiere rating</legend><div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map(star => <label key={star} className="relative cursor-pointer"><input className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name="premiere-rating" value={star} checked={rating === star} onChange={() => setRating(star)} aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`} /><span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-lg text-4xl transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#ddbd86] ${rating >= star ? 'text-[#ddbd86]' : 'text-white/20 hover:text-[#ddbd86]/60'}`}>★</span></label>)}</div></fieldset>
      <p className="mt-4 min-h-5 text-xs text-[#ddbd86]" aria-live="polite">{rating ? ['', 'Not for me', 'Had its moments', 'A good watch', 'Really enjoyed it', 'Something special'][rating] : 'Select 1–5 stars'}</p>
      {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
      <button className={`${styles.button} mt-6 w-full`} disabled={!rating || saving} onClick={async () => {
        setSaving(true); setError('')
        try { await theaterRequest(`/api/theater/${id}`, { action: 'rate', rating }); await onRated() }
        catch (error) { setError(error instanceof Error ? error.message : 'Could not save your rating.'); setSaving(false) }
      }}>{saving ? 'Saving your rating…' : 'Submit rating & finish'}</button>
    </div>
  </dialog>
}
