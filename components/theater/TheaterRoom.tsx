'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowRightIcon, CheckIcon, CloseIcon, FriendsIcon, ShareIcon } from '@/components/icons'
import { normalizeTheaterAvatar, playbackPosition, seatLabel, type TheaterRoomData } from '@/lib/theater'
import TheaterRating from './TheaterRating'
import {
  BackLink,
  Countdown,
  durationLabel,
  FullscreenGlyph,
  hudControl,
  hudSurface,
  LivePing,
  MuteGlyph,
  PlayGlyph,
  premiereDate,
  RecenterGlyph,
  SeatLegend,
  SeatMap,
  TheaterAccess,
  theaterRequest,
  VolumeGlyph,
} from './TheaterShared'
import styles from './theater.module.css'

const TheaterScene = dynamic(() => import('./TheaterScene'), { ssr: false })

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  live: 'Now showing',
  ended: 'Ended',
  cancelled: 'Cancelled',
}

function countdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`
  return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds % 3600 / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export default function TheaterRoom({ id, preview = false, autoEnter = false, roomNumber = 1 }: { id?: string; preview?: boolean; autoEnter?: boolean; roomNumber?: number }) {
  const router = useRouter()
  const roomElement = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const roomRef = useRef<TheaterRoomData | null>(null)
  const clockOffset = useRef(0)
  const autoEntryAttempted = useRef(false)
  const [room, setRoom] = useState<TheaterRoomData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [entered, setEntered] = useState(preview)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(0)
  const [ownerView, setOwnerView] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const [showAudience, setShowAudience] = useState(false)
  const [flatView, setFlatView] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [streamUrl, setStreamUrl] = useState('')
  const [streamAttempt, setStreamAttempt] = useState(0)
  const [needsPlay, setNeedsPlay] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [copied, setCopied] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    const start = Date.now()
    const data = await theaterRequest<TheaterRoomData>(`/api/theater/${id}`)
    // Use the server's clock, adjusted by half the request time, for late joins.
    clockOffset.current = new Date(data.serverNow).getTime() + (Date.now() - start) / 2 - Date.now()
    roomRef.current = data
    setRoom(data)
    setLoadError('')
    setNow(Date.now() + clockOffset.current)
  }, [id])

  useEffect(() => {
    if (preview) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        if (!document.hidden) {
          const data = roomRef.current
          if (entered && data && (data.mySeat !== null || data.premiere.isOwner)) {
            const video = videoRef.current
            await theaterRequest(`/api/theater/${id}`, { action: 'heartbeat', playing: Boolean(video && !video.paused && !video.ended && video.readyState >= 2) })
          }
          if (!stopped) await refresh()
        }
      } catch (error) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : 'Could not reconnect to the theater.'
          if (roomRef.current) setError(message)
          else setLoadError(message)
        }
      }
      if (!stopped) timer = setTimeout(poll, 5000)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer) }
  }, [entered, id, preview, refresh])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + clockOffset.current), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!entered) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Keep the underlying site navigation out of the immersive keyboard flow.
    const siblings: Array<{ element: HTMLElement; inert: boolean }> = []
    let branch: HTMLElement | null = roomElement.current
    while (branch && branch !== document.body) {
      for (const element of Array.from(branch.parentElement?.children ?? [])) {
        if (element !== branch && element instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(element.tagName)) {
          siblings.push({ element, inert: element.inert })
          element.inert = true
        }
      }
      branch = branch.parentElement
    }
    return () => { document.body.style.overflow = previous; siblings.forEach(({ element, inert }) => { element.inert = inert }) }
  }, [entered])

  const premiere = room?.premiere
  const startsAt = premiere ? new Date(premiere.startsAt).getTime() : 0
  const endsAt = premiere ? new Date(premiere.endsAt).getTime() : 0
  const status = premiere?.status === 'cancelled' ? 'cancelled' : premiere && now ? now < startsAt ? 'upcoming' : now < endsAt ? 'live' : 'ended' : premiere?.status
  const watchingAllowed = entered && status === 'live' && Boolean(premiere?.isOwner || room?.mySeat !== null) && !room?.pendingRatingId

  useEffect(() => {
    if (!watchingAllowed || !id) { setStreamUrl(''); return }
    const controller = new AbortController()
    setStreamUrl('')
    theaterRequest<{ url: string }>(`/api/theater/${id}/stream`, undefined, controller.signal).then(data => {
      setStreamUrl(data.url); setError('')
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [id, watchingAllowed, streamAttempt])

  const attachVideo = useCallback((element: HTMLVideoElement | null) => { videoRef.current = element; setVideoElement(element) }, [])
  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume }, [videoElement, volume])

  const syncVideo = useCallback((play = false) => {
    const video = videoRef.current
    const data = roomRef.current
    if (!video || !data || !Number.isFinite(video.duration)) return
    const position = playbackPosition(data.premiere.startsAt, data.premiere.durationSeconds, Date.now() + clockOffset.current)
    if (Math.abs(video.currentTime - position) > 1.5) video.currentTime = Math.min(position, video.duration)
    if (play && position < data.premiere.durationSeconds) {
      video.play().then(() => setNeedsPlay(false)).catch(() => setNeedsPlay(true))
    }
  }, [])
  useEffect(() => {
    if (!watchingAllowed || !videoElement) return
    const interval = setInterval(() => syncVideo(false), 3000)
    const visible = () => { if (!document.hidden) { void refresh().catch(() => {}); syncVideo(true) } }
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); videoElement.pause() }
  }, [watchingAllowed, videoElement, syncVideo, refresh])

  const enter = useCallback(async () => {
    if (!id || busy) return
    setBusy(true); setError('')
    try {
      let avatar: unknown
      try { avatar = JSON.parse(localStorage.getItem('nospoilers-pro-character') || '{}').config } catch { avatar = undefined }
      await theaterRequest(`/api/theater/${id}`, { action: 'join', avatar: normalizeTheaterAvatar(avatar) })
      await refresh()
      setEntered(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not reserve your seat.') }
    finally { setBusy(false) }
  }, [id, busy, refresh])

  useEffect(() => {
    if (!autoEnter || autoEntryAttempted.current || !room || entered) return
    autoEntryAttempted.current = true
    if (room.ratingRequired || room.pendingRatingId || !['upcoming', 'live'].includes(room.premiere.status)) return
    void enter()
  }, [autoEnter, room, entered, enter])

  async function leave() {
    if (busy) return
    if (preview || premiere?.isOwner || room?.myRating !== null && room?.myRating !== undefined) { router.push('/theater'); return }
    setBusy(true); setError('')
    try {
      await theaterRequest(`/api/theater/${id}`, { action: 'leave' })
      router.push('/theater')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not leave.'); await refresh().catch(() => {}); setBusy(false) }
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (roomElement.current?.requestFullscreen) await roomElement.current.requestFullscreen()
      else setError('Fullscreen is unavailable in this browser. The theater already fills your screen.')
    } catch { setError('Could not enter fullscreen. You can keep watching in this view.') }
  }

  const present = room?.participants.filter(p => p.present) ?? []
  const isOwner = premiere?.isOwner ?? false
  const blockedByRating = Boolean(room?.pendingRatingId && room.pendingRatingId !== id)

  const liveProgress = endsAt > startsAt ? Math.min(1, Math.max(0, (now - startsAt) / (endsAt - startsAt))) : 0

  if (!preview && !room) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <BackLink href="/theater">Back to Theater</BackLink>
        {loadError ? (
          <div className="mt-8">
            <TheaterAccess headingLevel={1} error={loadError} retry={() => { void refresh().catch(error => setLoadError(error.message)) }} callbackUrl={`/theater/${id}`} />
          </div>
        ) : (
          <>
            <h1 role="status" className="sr-only">Finding your theater…</h1>
            <div aria-hidden="true" className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
              <Skeleton className="aspect-[4/3] w-full rounded-3xl lg:aspect-auto lg:h-[min(72vh,680px)]" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-full" />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (!entered && premiere) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <BackLink href="/theater">Back to the marquee</BackLink>

        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black lg:aspect-auto lg:h-[min(62vh,560px)]">
            <TheaterScene capacity={premiere.capacity} ownerView={isOwner} participants={room?.participants} mySeat={room?.mySeat} />
            <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/75 px-3 py-1.5 text-sm text-white">
              {isOwner ? 'Your theater · 3D overview' : 'Your first-person view'}
            </span>
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted" size="md">{premiere.kind === 'film' ? 'Film premiere' : 'Trailer debut'}</Badge>
              <Badge variant={status === 'live' ? 'secondary' : 'outline'} size="md">
                {status === 'live' && <LivePing />}
                {STATUS_LABELS[status ?? ''] ?? status}
              </Badge>
            </div>
            <h1 className="mt-4 break-words font-display text-5xl text-ns-text sm:text-6xl">{premiere.title}</h1>
            <p className="mt-3 text-lg text-ns-muted">A premiere by {premiere.creatorName}</p>

            {status === 'upcoming' && (
              <section className="mt-7" aria-label="Time until the premiere">
                <p className="mb-2 text-sm font-semibold text-ns-text">Doors open in</p>
                <Countdown ms={startsAt - now} />
              </section>
            )}

            {status === 'live' && (
              <section className="mt-7" aria-label="Premiere progress">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-ns-secondary-readable">Playing now</p>
                  <p className="text-sm tabular-nums text-ns-muted">{durationLabel(premiere.durationSeconds)}</p>
                </div>
                <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-ns-surface-2">
                  <div className={`h-full rounded-full bg-ns-accent ${styles.meter}`} style={{ transform: `scaleX(${liveProgress})` }} />
                </div>
              </section>
            )}

            <div className="mt-7">
              {blockedByRating ? (
                <Button href={`/theater/${room!.pendingRatingId}`} size="lg" className="w-full">
                  Finish your previous premiere rating <ArrowRightIcon size={16} />
                </Button>
              ) : status === 'upcoming' || status === 'live' ? (
                <Button
                  onClick={enter}
                  loading={busy}
                  disabled={busy || (!isOwner && room?.mySeat === null && premiere.reservedSeats >= premiere.capacity)}
                  size="lg"
                  className="w-full"
                >
                  {busy ? 'Preparing your seat…' : isOwner ? 'Enter creator booth' : room?.mySeat !== null ? `Return to seat ${seatLabel(room!.mySeat!)}` : premiere.reservedSeats >= premiere.capacity ? 'Theater full' : status === 'live' ? 'Take a seat & join live' : 'Reserve a seat & enter'}
                </Button>
              ) : (
                <p className="rounded-xl bg-ns-surface p-5 text-base text-ns-text">
                  {status === 'cancelled' ? 'The creator cancelled this premiere.' : room?.myRating ? `Thank you for your ${room.myRating}-star rating.` : 'This premiere has ended.'}
                </p>
              )}
              {status === 'live' && !isOwner && <p className="mt-3 text-sm leading-relaxed text-ns-muted">The premiere is in progress. You’ll join at the current live moment.</p>}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={async () => {
                try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch { setError('Copy the premiere URL from your address bar to share it.') }
              }}>
                {copied ? <CheckIcon size={15} /> : <ShareIcon size={15} />}
                {copied ? 'Link copied' : 'Copy invitation link'}
              </Button>
              {isOwner && status === 'ended' && <Button variant="outline" onClick={() => setEntered(true)}>View audience results</Button>}
              {isOwner && status === 'upcoming' && <Button variant="ghost" onClick={() => setConfirmCancel(v => !v)}>Cancel premiere</Button>}
            </div>

            {confirmCancel && (
              <div className="mt-4 animate-fade-up rounded-xl bg-ns-danger/10 p-5 motion-reduce:animate-none">
                <p className="text-sm leading-relaxed text-ns-text">Cancel this scheduled premiere for all attendees?</p>
                <Button variant="danger" disabled={busy} className="mt-3" onClick={async () => {
                  setBusy(true)
                  try { await theaterRequest(`/api/theater/${id}`, { action: 'cancel' }); await refresh(); setConfirmCancel(false) }
                  catch (error) { setError(error instanceof Error ? error.message : 'Could not cancel.') }
                  finally { setBusy(false) }
                }}>Confirm cancellation</Button>
              </div>
            )}

            {error && <p role="alert" className="mt-4 animate-fade-up text-sm text-ns-danger motion-reduce:animate-none">{error}</p>}

            {premiere.description && (
              <p className="mt-8 whitespace-pre-wrap break-words border-t border-ns-border pt-6 text-base leading-relaxed text-ns-muted">{premiere.description}</p>
            )}

            <dl className="ns-reveal mt-6 grid grid-cols-2 gap-4 border-t border-ns-border pt-6 text-sm">
              <div>
                <dt className="text-ns-muted">Showtime</dt>
                <dd className="mt-1 font-semibold text-ns-text">{premiereDate(premiere.startsAt)}</dd>
              </div>
              <div>
                <dt className="text-ns-muted">Runtime</dt>
                <dd className="mt-1 font-semibold text-ns-text">{durationLabel(premiere.durationSeconds)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ns-muted">The experience</dt>
                <dd className="mt-1 font-semibold text-ns-text">First-person viewing · Shared avatars · Required audience rating</dd>
              </div>
            </dl>

          </div>

          <section className="ns-reveal rounded-3xl bg-ns-surface p-6 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-center sm:gap-8 sm:p-8 lg:col-start-1" aria-labelledby="theater-house-title">
            <div className="mb-6 sm:mb-0">
              <h2 id="theater-house-title" className="font-heading text-xl font-bold text-ns-text">The house</h2>
              <p className="mt-2 font-display text-5xl tabular-nums text-ns-text">
                <span key={premiere.reservedSeats} className="inline-block animate-fade-up motion-reduce:animate-none">{premiere.reservedSeats}</span>
                <span className="text-2xl text-ns-muted"> of {premiere.capacity}</span>
              </p>
              <p className="mt-1 text-sm text-ns-muted">seats reserved</p>
              <div className="mt-4"><SeatLegend showMine={room?.mySeat !== null && room?.mySeat !== undefined} /></div>
            </div>
            <SeatMap capacity={premiere.capacity} participants={room?.participants ?? []} mySeat={room?.mySeat ?? null} reserved={premiere.reservedSeats} />
          </section>
        </div>
        {room?.ratingRequired && <TheaterRating id={id!} title={premiere.title} onRated={refresh} />}
      </div>
    )
  }

  return (
    <div ref={roomElement} className="fixed inset-0 isolate z-[80] overflow-hidden bg-black text-white">
      <TheaterScene capacity={premiere?.capacity ?? (roomNumber % 3 === 0 ? 96 : roomNumber % 2 === 0 ? 24 : 48)} participants={room?.participants} mySeat={room?.mySeat ?? (roomNumber % 2 === 0 ? 11 : 27)} ownerView={isOwner && ownerView} video={streamUrl ? videoElement : null} resetKey={resetKey} onUnavailable={() => setFlatView(true)} />
      {streamUrl && <video ref={attachVideo} src={streamUrl} crossOrigin="anonymous" playsInline preload="auto" className={flatView ? 'absolute inset-0 h-full w-full bg-black object-contain' : 'pointer-events-none absolute h-px w-px opacity-0'} aria-label="Premiere playback" onLoadedMetadata={() => syncVideo(true)} onPlaying={() => {
        setNeedsPlay(false)
        if (id) void theaterRequest(`/api/theater/${id}`, { action: 'heartbeat', playing: true }).then(() => refresh()).catch(() => {})
      }} onEnded={() => { void refresh().catch(() => {}) }} onError={() => setError('The video could not load. Reconnect to the stream, or try a different browser.')} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="pointer-events-auto min-w-0">
          <p className="text-sm text-white"><span className="hidden sm:inline">NoSpoilers Theater · </span>{preview ? `Room ${String(roomNumber).padStart(2, '0')}` : isOwner ? 'Creator booth' : 'You’re in the audience'}</p>
          <h1 className="mt-0.5 line-clamp-2 break-words font-display text-xl text-white sm:text-3xl">{preview ? 'Welcome to your front-row moment.' : premiere?.title}</h1>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-sm tabular-nums text-white">
            <LivePing className={status === 'live' ? 'bg-ns-accent text-ns-accent' : 'bg-white text-white'} />
            {preview ? 'Explore the space' : status === 'upcoming' ? `Doors open · ${countdown(startsAt - now)}` : status === 'live' ? 'Live premiere' : status === 'cancelled' ? 'Premiere cancelled' : 'That’s a wrap'}
          </div>
        </div>
        <button onClick={leave} disabled={busy || room?.ratingRequired} className="pointer-events-auto inline-flex min-h-11 flex-shrink-0 items-center gap-2 rounded-full bg-ns-surface px-4 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowRightIcon size={15} className="rotate-180" />
          <span className="hidden sm:inline">Back to lobby</span><span className="sm:hidden">Lobby</span>
        </button>
      </header>

      {preview && (
        <div className={`pointer-events-none absolute bottom-36 left-4 max-w-xs sm:bottom-32 sm:left-6 ${styles.hudIn}`}>
          <p className="font-display text-2xl text-white">Go on. Look around.</p>
          <p className="mt-1 text-sm leading-relaxed text-white">At a premiere, the film plays on this screen and other viewers’ avatars fill the seats.</p>
        </div>
      )}

      {needsPlay && status === 'live' && (
        <div className="absolute inset-x-4 top-[43%] flex justify-center">
          <Button size="lg" className="shadow-2xl" onClick={() => syncVideo(true)}><PlayGlyph /> Join playback with sound</Button>
        </div>
      )}

      {status === 'upcoming' && (
        <div className={`pointer-events-none absolute inset-x-4 bottom-40 flex justify-center sm:bottom-36 ${styles.hudIn}`}>
          <div className={`${hudSurface} w-full max-w-md p-5 text-center`}>
            <p className="text-sm font-semibold text-ns-secondary-readable">You’re early. The best seats are yours.</p>
            <div className="mt-3"><Countdown ms={startsAt - now} /></div>
            <p className="mt-3 text-sm text-ns-muted">
              Until the first frame · <span key={present.length} className="inline-block animate-fade-up font-semibold text-ns-text motion-reduce:animate-none">{present.length}</span> in the audience
            </p>
          </div>
        </div>
      )}

      {status === 'ended' && !room?.ratingRequired && (
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-center">
          <div className={`${hudSurface} w-full max-w-md p-7 text-center sm:p-9 ${styles.hudIn}`}>
            <h2 className="font-display text-3xl text-ns-text">{isOwner ? 'Your audience has spoken.' : 'Thanks for shaping the film.'}</h2>
            {isOwner ? (
              <div className="mt-5">
                {room?.ratingSummary?.average ? (
                  <>
                    <p className="font-display text-6xl tabular-nums text-ns-text">{room.ratingSummary.average.toFixed(1)}<span className="text-2xl text-ns-muted"> / 5 overall</span></p>
                    <div aria-hidden="true" className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-ns-surface-2">
                      <div className={`h-full rounded-full bg-ns-accent ${styles.meter} ${styles.barGrow}`} style={{ transform: `scaleX(${room.ratingSummary.average / 5})` }} />
                    </div>
                    <p className="mt-3 text-sm text-ns-muted">{room.ratingSummary.count} responses</p>
                  </>
                ) : (
                  <p className="text-base text-ns-muted">{room?.ratingSummary?.count ?? 0} responses · Results appear as viewers finish</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-base text-ns-muted">{room?.myRating ? 'Your private response is with the filmmaker · +25 Audience XP' : 'This premiere has ended.'}</p>
            )}
            {isOwner && id
              ? <Button href={`/creator/labs/${id}`} className="mt-6">Open Audience Lab report</Button>
              : <Button onClick={leave} className="mt-6">Back to the marquee</Button>}
          </div>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-center">
          <div className={`${hudSurface} w-full max-w-sm p-7 text-center ${styles.hudIn}`}>
            <p className="text-lg text-ns-text">The creator cancelled this premiere.</p>
            <Button onClick={() => router.push('/theater')} className="mt-5">Back to Theater</Button>
          </div>
        </div>
      )}

      {showAudience && (
        <aside aria-label="Theater audience" className={`${hudSurface} absolute bottom-40 right-4 top-[7.5rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto p-5 sm:right-6 sm:top-28 ${styles.drawerIn}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-bold text-ns-text">In the room <span className="tabular-nums text-ns-secondary-readable">{present.length}</span></h2>
            <button className={`${hudControl} -mr-2`} onClick={() => setShowAudience(false)} aria-label="Close audience"><CloseIcon size={17} /></button>
          </div>
          <p className="mb-3 mt-1 text-sm leading-relaxed text-ns-muted">{preview ? 'This is an empty theater preview.' : 'Avatars appear as viewers enter. Seats stay reserved if someone steps away.'}</p>
          {present.length === 0 ? (
            <p className="py-5 text-sm text-ns-muted">The audience is yet to arrive.</p>
          ) : (
            <ul className="divide-y divide-ns-border">
              {present.map(person => (
                <li key={person.userId} className={`flex items-center gap-3 py-2.5 ${styles.seatIn}`}>
                  <span aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ns-surface-3 text-sm font-semibold text-ns-text">{person.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ns-text">{person.name}{person.userId === room?.viewerId ? ' (you)' : ''}</span>
                  <span className="text-sm tabular-nums text-ns-muted">{seatLabel(person.seat)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {error && (
        <div role="alert" className={`${hudSurface} absolute inset-x-4 top-32 z-10 mx-auto flex max-w-xl flex-wrap items-center justify-center gap-3 p-4 text-sm text-ns-danger ${styles.hudIn}`}>
          <span>{error}</span>
          {status === 'live' && <button className="min-h-11 px-2 font-semibold underline" onClick={() => { setError(''); setStreamAttempt(value => value + 1) }}>Reconnect playback</button>}
          <button aria-label="Dismiss message" className={hudControl} onClick={() => setError('')}><CloseIcon size={16} /></button>
        </div>
      )}

      <footer className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-2 sm:inset-x-6 sm:bottom-6">
        <p className="pointer-events-none text-center text-sm text-white">
          {flatView ? 'Screen view' : isOwner && ownerView
            ? <>Drag to orbit<span className="hidden sm:inline"> · Scroll to zoom · R to reset</span></>
            : <>Drag to look around<span className="hidden sm:inline"> · Arrow keys to turn · R to face the screen</span></>}
        </p>
        <div className={`${hudSurface} flex w-full max-w-3xl flex-wrap items-center justify-between gap-1 rounded-full py-1.5 pl-5 pr-2 max-sm:rounded-2xl max-sm:pl-3`}>
          <div className="min-w-0">
            <p className="text-xs text-ns-muted">{isOwner ? 'Director’s view' : 'Your seat'}</p>
            <p className="truncate text-sm font-semibold text-ns-text">{isOwner ? ownerView ? 'The whole theater' : 'Audience perspective' : `${seatLabel(room?.mySeat ?? 27)} · ${preview ? 'Preview' : 'Audience'}`}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-0.5">
            <button className={hudControl} onClick={() => setResetKey(v => v + 1)} aria-label="Face the screen" title="Recenter view"><RecenterGlyph /></button>
            <button className={`${hudControl} gap-1.5 px-3`} aria-label="Show audience" aria-expanded={showAudience} onClick={() => setShowAudience(v => !v)}>
              <FriendsIcon size={17} />
              <span key={present.length} className="inline-block animate-fade-up text-sm font-semibold tabular-nums motion-reduce:animate-none">{present.length}</span>
            </button>
            {isOwner && <button className={`${hudControl} px-4 text-sm font-semibold`} aria-pressed={ownerView} onClick={() => setOwnerView(v => !v)}>{ownerView ? 'Try a seat' : '3D overview'}</button>}
            {streamUrl && (
              <>
                <button className={hudControl} onClick={() => setVolume(v => v > 0 ? 0 : 0.8)} aria-label={volume > 0 ? 'Mute audio' : 'Unmute audio'}>{volume > 0 ? <VolumeGlyph /> : <MuteGlyph />}</button>
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" className="hidden w-16 accent-ns-secondary sm:block" />
                <button className={`${hudControl} px-3 text-sm font-semibold`} aria-pressed={flatView} onClick={() => setFlatView(v => !v)}>{flatView ? '3D view' : 'Screen view'}</button>
              </>
            )}
            <button className={hudControl} onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><FullscreenGlyph /></button>
          </div>
        </div>
      </footer>
      {room?.ratingRequired && <TheaterRating id={id!} title={premiere!.title} onRated={async () => { await refresh(); setEntered(false) }} />}
    </div>
  )
}
