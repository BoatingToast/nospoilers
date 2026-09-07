'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { ArrowRightIcon, ClapperboardIcon } from '@/components/icons'
import { THEATER_CAPACITIES } from '@/lib/theater'
import { durationLabel, TheaterAccess, theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

interface Upload { id: string; title: string; description: string | null; mimeType: string }

export default function CreatePremiere() {
  const router = useRouter()
  const [uploads, setUploads] = useState<Upload[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [uploadId, setUploadId] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('film')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [timezone, setTimezone] = useState('your local time')
  const [capacity, setCapacity] = useState(48)
  const [promoted, setPromoted] = useState(false)
  const [adCopy, setAdCopy] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    theaterRequest<{ uploads: Upload[] }>('/api/theater/uploads', undefined, controller.signal).then(data => setUploads(data.uploads)).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message)
    })
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setDuration(null)
    setPreviewUrl('')
    if (!uploadId) return
    const controller = new AbortController()
    theaterRequest<{ url: string }>(`/api/theater/uploads/${uploadId}`, undefined, controller.signal)
      .then(data => { setError(''); setPreviewUrl(data.url) })
      .catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [uploadId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!duration || !rightsConfirmed || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await theaterRequest<{ id: string }>('/api/theater', {
        uploadId, title, description, kind, startsAt: new Date(startsAt).toISOString(), durationSeconds: duration,
        capacity, promoted, adCopy,
      })
      router.push(`/theater/${result.id}`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not schedule this premiere.'); setSaving(false) }
  }

  return <div className={`${styles.theater} px-5 py-9 sm:px-10 sm:py-12`}><div className="mx-auto max-w-6xl">
    <Link href="/theater" className="text-xs text-white/50 hover:text-white">← Back to Theater</Link>
    <header className="mb-10 mt-10"><p className={styles.eyebrow}>The creator’s booth</p><h1 className={`${styles.title} mt-4 text-5xl sm:text-6xl`}>Give your story<br />an <em className="text-[#ddbd86]">opening night.</em></h1><p className="mt-5 max-w-lg text-sm leading-7 text-white/50">Your film. Your audience. One shared first frame. Set the stage and we’ll save a seat for the moment it begins.</p></header>
    {loadError ? <TheaterAccess error={loadError} callbackUrl="/theater/new" /> : !uploads ? <p role="status" className="py-10 text-white/50">Loading your films…</p> : uploads.length === 0 ? <div className={`${styles.panel} p-10 text-center`}><ClapperboardIcon className="mx-auto text-[#ddbd86]" size={32} /><h2 className={`${styles.title} mt-5 text-3xl`}>First, bring your film.</h2><p className="mt-4 text-sm text-white/50">Upload your film or trailer in Creator Studio, then come back to schedule its premiere.</p><Link href="/creator" className={`${styles.button} mt-6`}>Upload a film <ArrowRightIcon size={14} /></Link></div> : <form onSubmit={submit} className="grid items-start gap-8 lg:grid-cols-[1.3fr_0.8fr]">
      <div className="space-y-6">
        <section className={`${styles.panel} space-y-6 p-6 sm:p-8`}><h2 className="flex items-center gap-3 text-sm font-medium"><span className="font-mono text-xs text-[#ddbd86]">01</span> The story</h2>
          <label className={styles.field}>Your uploaded video<select required className={styles.input} value={uploadId} onChange={event => {
            setUploadId(event.target.value)
            const movie = uploads.find(u => u.id === event.target.value)
            if (movie) { setTitle(movie.title); setDescription(movie.description ?? '') }
          }}><option value="">Choose a completed upload</option>{uploads.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label>
          {uploadId && <div className="rounded-lg border border-white/10 p-3">
            {previewUrl && <video key={previewUrl} src={previewUrl} preload="metadata" controls playsInline className="mb-3 max-h-60 w-full rounded bg-black" onLoadedMetadata={event => {
              const seconds = event.currentTarget.duration
              if (Number.isFinite(seconds) && seconds > 0 && seconds <= 14_400) setDuration(Math.ceil(seconds))
              else setError('Choose a video between one second and four hours long.')
            }} onError={() => { setDuration(null); setError('This browser cannot play the upload. Try an H.264 MP4 or a supported WebM file in Creator Studio.') }} />}
            <p role="status" className="text-xs text-white/50">{duration ? `${durationLabel(duration)} · Video ready. Check the preview before scheduling.` : 'Checking video playback and runtime…'}</p>
          </div>}
          <fieldset><legend className="mb-3 text-xs text-white/60">What are you premiering?</legend><div className="grid grid-cols-2 gap-3">{[['film', 'Film premiere', 'The full story, on the big screen.'], ['trailer', 'Trailer debut', 'A first look at what’s coming.']].map(([value, label, detail]) => <label key={value} className={`cursor-pointer rounded-lg border p-4 ${kind === value ? 'border-[#ddbd86]/60 bg-[#ddbd86]/5' : 'border-white/10'}`}><span className="flex items-center gap-2 text-xs"><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="accent-[#ddbd86]" />{label}</span><span className="mt-2 block text-[10px] leading-5 text-white/40">{detail}</span></label>)}</div></fieldset>
          <label className={styles.field}>Premiere title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="The title on your marquee" /></label>
          <label className={styles.field}>Spoiler-free introduction<textarea rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} className={styles.input} placeholder="Set the mood. Save the surprises for the screen." /></label>
          <Link href="/creator" className="inline-block text-xs text-[#ddbd86]">Upload another video ↗</Link>
        </section>
        <section className={`${styles.panel} space-y-6 p-6 sm:p-8`}><h2 className="flex items-center gap-3 text-sm font-medium"><span className="font-mono text-xs text-[#ddbd86]">02</span> The opening night</h2>
          <label className={styles.field}>Date and time<input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} className={styles.input} /><span className="text-[10px] leading-5 text-white/40">{timezone} · Schedule at least one minute ahead. Playback starts automatically for everyone.</span></label>
          <label className={styles.field}>Theater size<select value={capacity} onChange={e => setCapacity(Number(e.target.value))} className={styles.input}>{THEATER_CAPACITIES.map(size => <option key={size} value={size}>{size} seats · {size === 24 ? 'Intimate screening' : size === 48 ? 'Classic cinema' : 'Opening-night crowd'}</option>)}</select></label>
        </section>
        <section className={`${styles.panel} space-y-5 p-6 sm:p-8`}><h2 className="flex items-center gap-3 text-sm font-medium"><span className="font-mono text-xs text-[#ddbd86]">03</span> Spread the word</h2><label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={promoted} onChange={e => setPromoted(e.target.checked)} className="mt-1 accent-[#ddbd86]" /><span>Promote this premiere in Theater<span className="mt-2 block text-xs leading-6 text-white/45">Create a spotlight ad for the Theater lobby. Included during the Pro preview.</span></span></label>{promoted && <label className={styles.field}>Your ad headline<input required maxLength={180} value={adCopy} onChange={e => setAdCopy(e.target.value)} className={styles.input} placeholder="One night. Your first look at something different." /><span className="text-[10px] text-white/40">{adCopy.length}/180</span></label>}</section>
        <label className="flex items-start gap-3 text-xs leading-6 text-white/60"><input type="checkbox" required checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} className="mt-1.5 accent-[#ddbd86]" />I own this film or have permission to screen it for the NoSpoilers audience.</label>
        {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{error}</p>}
        <button className={`${styles.button} w-full`} disabled={saving || !duration || !rightsConfirmed}>{saving ? 'Setting the stage…' : 'Schedule premiere'} <ArrowRightIcon size={15} /></button>
      </div>
      <aside className="lg:sticky lg:top-24"><p className={`${styles.eyebrow} mb-4`}>Your marquee preview</p><div className={`${styles.panel} overflow-hidden`}><div className="relative flex min-h-72 flex-col justify-end bg-[radial-gradient(ellipse_at_top_right,#67475e,#2a2037_55%,#16111f)] p-7"><ClapperboardIcon size={60} className="absolute right-7 top-8 text-[#ddbd86]/25" /><p className="mb-5 text-[9px] uppercase tracking-[.2em] text-[#ddbd86]">{kind === 'film' ? 'A film premiere' : 'A trailer debut'}</p><h2 className={`${styles.title} break-words text-4xl`}>{title || 'Your story here.'}</h2></div><div className="space-y-4 p-6"><p className="text-xs text-[#ddbd86]">{startsAt ? new Date(startsAt).toLocaleString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Your opening night, to be announced'}</p><p className="whitespace-pre-wrap break-words text-xs leading-6 text-white/50">{description || 'A room full of people, discovering your story for the very first time.'}</p><p className="border-t border-white/10 pt-4 text-[10px] uppercase tracking-widest text-white/40">{capacity} seats · {duration ? durationLabel(duration) : '3D theater'} · Required audience ratings</p></div></div>{promoted && <div className="mt-4 rounded-xl border border-[#ddbd86]/25 bg-[#ddbd86]/5 p-5"><p className="text-[9px] uppercase tracking-widest text-[#ddbd86]">Creator promotion</p><p className={`${styles.title} mt-3 break-words text-2xl`}>{adCopy || 'Your spotlight headline.'}</p></div>}<p className="mt-6 text-xs leading-6 text-white/40">You’ll have a 3D overview of the whole room and audience rating results. Viewers will watch from their own seats, with their Pro avatars beside them.</p></aside>
    </form>}
  </div></div>
}
