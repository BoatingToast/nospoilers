'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowRightIcon } from '@/components/icons'
import { THEATER_CAPACITIES } from '@/lib/theater'
import { BackLink, durationLabel, fieldClass, labelClass, TheaterAccess, theaterRequest } from './TheaterShared'

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <BackLink href="/theater">Back to Theater</BackLink>
      <PageHeader
        className="mb-8 mt-4 lg:mb-12"
        title={<>Give your story an <span className="text-ns-secondary-readable">opening night.</span></>}
        description="Your film. Your audience. One shared first frame, followed by private feedback you can use to improve the cut and prove demand."
      />

      {loadError ? (
        <TheaterAccess error={loadError} callbackUrl="/theater/new" />
      ) : !uploads ? (
        <div role="status" aria-label="Loading your films" className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
        </div>
      ) : uploads.length === 0 ? (
        <EmptyState
          className="rounded-3xl"
          title="First, bring your film."
          description="Upload your film or trailer in Creator Studio, then come back to schedule its premiere."
          action={<Button href="/creator">Upload a film <ArrowRightIcon size={14} /></Button>}
        />
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0 space-y-5">
            <section className="space-y-6 rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10">
              <h2 className="font-display text-2xl text-ns-text sm:text-3xl">The story</h2>

              <label className={labelClass}>
                Your uploaded video
                <select required className={fieldClass} value={uploadId} onChange={event => {
                  setUploadId(event.target.value)
                  const movie = uploads.find(u => u.id === event.target.value)
                  if (movie) { setTitle(movie.title); setDescription(movie.description ?? '') }
                }}>
                  <option value="">Choose a completed upload</option>
                  {uploads.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                </select>
              </label>

              {uploadId && (
                <div className="animate-fade-up rounded-xl bg-ns-surface-2 p-3 motion-reduce:animate-none">
                  {previewUrl && <video key={previewUrl} src={previewUrl} preload="metadata" controls playsInline className="mb-3 max-h-72 w-full rounded-lg bg-black" onLoadedMetadata={event => {
                    const seconds = event.currentTarget.duration
                    if (Number.isFinite(seconds) && seconds > 0 && seconds <= 14_400) setDuration(Math.ceil(seconds))
                    else setError('Choose a video between one second and four hours long.')
                  }} onError={() => { setDuration(null); setError('This browser cannot play the upload. Try an H.264 MP4 or a supported WebM file in Creator Studio.') }} />}
                  <p role="status" className="px-1 text-sm text-ns-muted">{duration ? `${durationLabel(duration)} · Video ready. Check the preview before scheduling.` : 'Checking video playback and runtime…'}</p>
                </div>
              )}

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ns-text">What are you premiering?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[['film', 'Film premiere', 'The full story, on the big screen.'], ['trailer', 'Trailer debut', 'A first look at what’s coming.']].map(([value, label, detail]) => (
                    <label key={value} className={`block cursor-pointer rounded-xl p-4 transition-colors duration-150 ${kind === value ? 'bg-ns-surface-3' : 'bg-ns-surface-2 hover:bg-ns-surface-3'}`}>
                      <span className="flex items-center gap-2 text-base font-semibold text-ns-text">
                        <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="h-4 w-4 accent-ns-secondary" />
                        {label}
                      </span>
                      <span className="mt-1 block pl-6 text-sm leading-relaxed text-ns-muted">{detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className={labelClass}>
                Premiere title
                <input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={fieldClass} placeholder="The title on your marquee" />
              </label>
              <label className={labelClass}>
                Spoiler-free introduction
                <textarea rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} className={fieldClass} placeholder="Set the mood. Save the surprises for the screen." />
              </label>
              <Link href="/creator" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable">
                Upload another video <ArrowRightIcon size={14} />
              </Link>
            </section>

            <section className="ns-reveal space-y-6 rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10">
              <h2 className="font-display text-2xl text-ns-text sm:text-3xl">The opening night</h2>
              <label className={labelClass}>
                Date and time
                <input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} className={fieldClass} />
                <span className="text-sm font-normal leading-relaxed text-ns-muted">{timezone} · Schedule at least one minute ahead. Playback starts automatically for everyone.</span>
              </label>
              <label className={labelClass}>
                Theater size
                <select value={capacity} onChange={e => setCapacity(Number(e.target.value))} className={fieldClass}>
                  {THEATER_CAPACITIES.map(size => <option key={size} value={size}>{size} seats · {size === 24 ? 'Intimate screening' : size === 48 ? 'Classic cinema' : 'Opening-night crowd'}</option>)}
                </select>
              </label>
            </section>

            <section className="ns-reveal space-y-5 rounded-3xl bg-ns-surface p-6 sm:p-8 lg:p-10">
              <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Spread the word</h2>
              <label className="flex cursor-pointer items-start gap-3 text-base font-semibold text-ns-text">
                <input type="checkbox" checked={promoted} onChange={e => setPromoted(e.target.checked)} className="mt-1 h-4 w-4 accent-ns-secondary" />
                <span>
                  Promote this premiere in Theater
                  <span className="mt-1 block text-sm font-normal leading-relaxed text-ns-muted">Create a spotlight ad for the Theater lobby. Included during the Pro preview.</span>
                </span>
              </label>
              {promoted && (
                <label className={`${labelClass} animate-fade-up motion-reduce:animate-none`}>
                  Your ad headline
                  <input required maxLength={180} value={adCopy} onChange={e => setAdCopy(e.target.value)} className={fieldClass} placeholder="One night. Your first look at something different." />
                  <span className="text-xs font-normal tabular-nums text-ns-muted">{adCopy.length}/180</span>
                </label>
              )}
            </section>

            <div className="ns-reveal rounded-3xl bg-ns-surface p-6 sm:p-8">
              <h3 className="font-heading text-xl font-bold text-ns-text">Included after the credits</h3>
              <p className="mt-2 text-sm leading-relaxed text-ns-muted">Recommendation intent · Pacing · Emotional reactions · Anonymous notes · Audience taste fit</p>
              <p className="mt-2 text-sm text-ns-muted">Viewers earn +25 Audience XP for responding.</p>
              <p className="mt-3 border-t border-ns-border pt-3 text-sm leading-relaxed text-ns-muted">You’ll have a 3D overview of the room and a private Audience Lab report. Individual taste profiles and viewer identities are never exposed.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 px-1 text-sm leading-relaxed text-ns-muted">
              <input type="checkbox" required checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-ns-secondary" />
              I own this film or have permission to screen it for the NoSpoilers audience.
            </label>
            {error && <p role="alert" className="animate-fade-up rounded-xl bg-ns-danger/10 p-4 text-sm text-ns-danger motion-reduce:animate-none">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={saving} disabled={saving || !duration || !rightsConfirmed}>
              {saving ? 'Setting the stage…' : 'Schedule premiere'} {!saving && <ArrowRightIcon size={16} />}
            </Button>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Your marquee preview">
            <div className="relative mx-auto flex aspect-[2/3] w-full max-w-xs flex-col justify-between overflow-hidden rounded-xl bg-ns-surface-2 p-6 shadow-2xl lg:max-w-none">
              <div>
                <div aria-hidden="true" className="h-1.5 w-12 rounded-full bg-ns-accent" />
                <p key={kind} className="mt-4 animate-fade-up text-sm font-semibold text-ns-secondary-readable motion-reduce:animate-none">{kind === 'film' ? 'A film premiere' : 'A trailer debut'}</p>
              </div>
              <div className="min-w-0">
                <h2 className="break-words font-display text-4xl text-ns-text">{title || 'Your story here.'}</h2>
                <p className="mt-3 text-sm font-semibold text-ns-text">
                  {startsAt ? new Date(startsAt).toLocaleString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Your opening night, to be announced'}
                </p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ns-muted">{description || 'A room full of people, discovering your story for the very first time.'}</p>
                <p className="mt-3 border-t border-ns-border pt-3 text-sm tabular-nums text-ns-muted">{capacity} seats · {duration ? durationLabel(duration) : '3D theater'} · Audience Lab feedback</p>
              </div>
            </div>

            {promoted && (
              <div className="animate-fade-up rounded-xl bg-ns-tile-rose p-5 motion-reduce:animate-none">
                <p className="text-sm font-semibold text-ns-secondary-readable">Creator promotion</p>
                <p className="mt-2 break-words font-heading text-xl font-bold text-ns-text">{adCopy || 'Your spotlight headline.'}</p>
              </div>
            )}

          </aside>
        </form>
      )}
    </div>
  )
}
