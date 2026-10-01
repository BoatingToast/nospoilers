'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
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

  return <div className={`${styles.theater} px-4 py-8 sm:px-6 sm:py-12`}><div className="mx-auto w-full min-w-0 max-w-6xl">
    <Link href="/theater" className="inline-flex min-h-10 items-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">← Back to Theater</Link>
    <PageHeader title="Give your story an opening night." lede="Your film. Your audience. One shared first frame. Set the stage and we’ll save a seat for the moment it begins." className="mb-10 mt-6" />
    {loadError ? <TheaterAccess error={loadError} callbackUrl="/theater/new" /> : !uploads ? <p role="status" className="py-10 text-white/50">Loading your films…</p> : uploads.length === 0 ? <Section title="First, bring your film." note="Upload your film or trailer in Creator Studio, then come back to schedule its premiere."><Link href="/creator" className={styles.button}>Upload a film</Link></Section> : <form onSubmit={submit} className="grid min-w-0 items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-10">
        <Section title="The story"><div className="space-y-6">
          <label className={styles.field}>Your uploaded video<select required className={styles.input} value={uploadId} onChange={event => {
            setUploadId(event.target.value)
            const movie = uploads.find(u => u.id === event.target.value)
            if (movie) { setTitle(movie.title); setDescription(movie.description ?? '') }
          }}><option value="">Choose a completed upload</option>{uploads.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select></label>
          {uploadId && <div className={`${styles.rule} pt-3`}>
            {previewUrl && <video key={previewUrl} src={previewUrl} preload="metadata" controls playsInline className="mb-3 max-h-60 w-full rounded bg-black" onLoadedMetadata={event => {
              const seconds = event.currentTarget.duration
              if (Number.isFinite(seconds) && seconds > 0 && seconds <= 14_400) setDuration(Math.ceil(seconds))
              else setError('Choose a video between one second and four hours long.')
            }} onError={() => { setDuration(null); setError('This browser cannot play the upload. Try an H.264 MP4 or a supported WebM file in Creator Studio.') }} />}
            <p role="status" className="text-xs text-white/50">{duration ? `${durationLabel(duration)} · Video ready. Check the preview before scheduling.` : 'Checking video playback and runtime…'}</p>
          </div>}
          <fieldset><legend className="mb-3 text-sm text-white/60">What are you premiering?</legend><div className="grid gap-3 sm:grid-cols-2">{[['film', 'Film premiere', 'The full story, on the big screen.'], ['trailer', 'Trailer debut', 'A first look at what’s coming.']].map(([value, label, detail]) => <label key={value} className={`cursor-pointer rounded border p-4 ${kind === value ? 'border-[#ddbd86]/60' : 'border-white/10'}`}><span className="flex items-center gap-2 text-sm"><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="accent-[#ddbd86]" />{label}</span><span className="mt-2 block text-xs leading-5 text-white/50">{detail}</span></label>)}</div></fieldset>
          <label className={styles.field}>Premiere title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="The title on your marquee" /></label>
          <label className={styles.field}>Spoiler-free introduction<textarea rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} className={styles.input} placeholder="Set the mood. Save the surprises for the screen." /></label>
          <Link href="/creator" className="inline-flex min-h-10 items-center text-sm text-[#ddbd86] underline underline-offset-4">Upload another video ↗</Link>
        </div></Section>
        <Section title="The opening night"><div className="space-y-6">
          <label className={styles.field}>Date and time<input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} className={styles.input} /><span className="text-xs leading-5 text-white/50">{timezone} · Schedule at least one minute ahead. Playback starts automatically for everyone.</span></label>
          <label className={styles.field}>Theater size<select value={capacity} onChange={e => setCapacity(Number(e.target.value))} className={styles.input}>{THEATER_CAPACITIES.map(size => <option key={size} value={size}>{size} seats · {size === 24 ? 'Intimate screening' : size === 48 ? 'Classic cinema' : 'Opening-night crowd'}</option>)}</select></label>
        </div></Section>
        <Section title="Spread the word"><div className="space-y-5"><label className="flex min-h-10 cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={promoted} onChange={e => setPromoted(e.target.checked)} className="mt-1 accent-[#ddbd86]" /><span>Promote this premiere in Theater<span className="mt-2 block text-xs leading-6 text-white/50">Create a spotlight ad for the Theater lobby. Included during the Pro preview.</span></span></label>{promoted && <label className={styles.field}>Your ad headline<input required maxLength={180} value={adCopy} onChange={e => setAdCopy(e.target.value)} className={styles.input} placeholder="One night. Your first look at something different." /><span className="text-xs text-white/50">{adCopy.length}/180</span></label>}</div></Section>
        <label className="flex min-h-10 items-start gap-3 text-sm leading-6 text-white/60"><input type="checkbox" required checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} className="mt-1.5 accent-[#ddbd86]" />I own this film or have permission to screen it for the NoSpoilers audience.</label>
        {error && <p role="alert" className="border-t border-rose-400/40 pt-3 text-sm text-rose-200">{error}</p>}
        <button className={`${styles.button} w-full`} disabled={saving || !duration || !rightsConfirmed}>{saving ? 'Setting the stage…' : 'Schedule premiere'}</button>
      </div>
      <aside className={`${styles.panel} min-w-0 lg:sticky lg:top-24`}>
        <p className="text-sm text-white/60">Your marquee preview · {kind === 'film' ? 'A film premiere' : 'A trailer debut'}</p>
        <h2 className="mt-3 break-words font-display text-4xl leading-none tracking-wide sm:text-5xl">{title || 'Your story here.'}</h2>
        <p className="mt-4 text-sm text-[#ddbd86]">{startsAt ? new Date(startsAt).toLocaleString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Your opening night, to be announced'}</p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/55">{description || 'A room full of people, discovering your story for the very first time.'}</p>
        <p className={`${styles.rule} mt-5 pt-4 text-xs text-white/50`}>{capacity} seats · {duration ? durationLabel(duration) : '3D theater'} · Required audience ratings</p>
        {promoted && <div className={`${styles.rule} mt-4 pt-4`}><p className="text-xs text-[#ddbd86]">Creator promotion</p><p className="mt-2 break-words font-display text-2xl leading-none tracking-wide">{adCopy || 'Your spotlight headline.'}</p></div>}
        <p className={`${styles.rule} mt-4 pt-4 text-xs leading-6 text-white/50`}>You’ll have a 3D overview of the whole room and audience rating results. Viewers will watch from their own seats, with their Pro avatars beside them.</p>
      </aside>
    </form>}
  </div></div>
}
