'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ClapperboardIcon, FriendsIcon } from '@/components/icons'
import { normalizeTheaterAvatar, playbackPosition, seatLabel, type TheaterRoomData } from '@/lib/theater'
import TheaterRating from './TheaterRating'
import { durationLabel, premiereDate, TheaterAccess, theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

const TheaterScene = dynamic(() => import('./TheaterScene'), { ssr: false })

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

  if (!preview && !room) return <div className={`${styles.theater} px-5 py-16`}><Link href="/theater" className="mx-auto mb-8 block max-w-xl text-xs text-white/50">← Back to Theater</Link>{loadError ? <TheaterAccess error={loadError} retry={() => { void refresh().catch(error => setLoadError(error.message)) }} callbackUrl={`/theater/${id}`} /> : <p role="status" className="py-28 text-center text-sm text-white/50">Finding your theater…</p>}</div>

  if (!entered && premiere) return <div className={`${styles.theater} px-5 py-10 sm:px-10`}><div className="mx-auto max-w-6xl">
    <Link href="/theater" className="text-xs text-white/50 hover:text-white">← Back to the marquee</Link>
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr]"><div className="relative min-h-72 overflow-hidden rounded-2xl border border-white/10 sm:min-h-[480px]"><TheaterScene capacity={premiere.capacity} ownerView={isOwner} participants={room?.participants} mySeat={room?.mySeat} /><span className="pointer-events-none absolute bottom-5 left-5 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[9px] uppercase tracking-widest backdrop-blur">{isOwner ? 'Your theater · 3D overview' : 'Your first-person view'}</span></div>
      <div className="py-4"><p className={styles.eyebrow}>{premiere.kind === 'film' ? 'Film premiere' : 'Trailer debut'} · {status === 'live' ? 'Now showing' : status}</p><h1 className={`${styles.title} mt-5 break-words text-5xl sm:text-6xl`}>{premiere.title}</h1><p className="mt-4 text-sm text-[#ddbd86]">A premiere by {premiere.creatorName}</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/55">{premiere.description}</p><div className="my-7 space-y-3 border-y border-white/10 py-5 text-xs text-white/55"><p>{premiereDate(premiere.startsAt)}</p><p>{durationLabel(premiere.durationSeconds)} · {premiere.reservedSeats} of {premiere.capacity} seats reserved</p><p>First-person viewing · Shared avatars · Required audience rating</p></div>
        {blockedByRating ? <Link href={`/theater/${room!.pendingRatingId}`} className={styles.button}>Finish your previous premiere rating →</Link> : status === 'upcoming' || status === 'live' ? <button onClick={enter} disabled={busy || (!isOwner && room?.mySeat === null && premiere.reservedSeats >= premiere.capacity)} className={`${styles.button} w-full`}>{busy ? 'Preparing your seat…' : isOwner ? 'Enter creator booth' : room?.mySeat !== null ? `Return to seat ${seatLabel(room!.mySeat!)}` : premiere.reservedSeats >= premiere.capacity ? 'Theater full' : status === 'live' ? 'Take a seat & join live' : 'Reserve a seat & enter'}</button> : <p className="text-sm text-[#ddbd86]">{status === 'cancelled' ? 'The creator cancelled this premiere.' : room?.myRating ? `Thank you for your ${room.myRating}-star rating.` : 'This premiere has ended.'}</p>}
        {status === 'live' && !isOwner && <p className="mt-3 text-[11px] leading-6 text-white/40">The premiere is in progress. You’ll join at the current live moment.</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button className={`${styles.button} ${styles.secondary}`} onClick={async () => {
          try { await navigator.clipboard.writeText(window.location.href); setCopied(true) } catch { setError('Copy the premiere URL from your address bar to share it.') }
        }}>{copied ? 'Link copied' : 'Copy invitation link'}</button>{isOwner && status === 'ended' && <button onClick={() => setEntered(true)} className={`${styles.button} ${styles.secondary}`}>View audience results</button>}{isOwner && status === 'upcoming' && <button onClick={() => setConfirmCancel(v => !v)} className="px-3 text-xs text-white/40">Cancel premiere</button>}</div>
        {confirmCancel && <div className={`${styles.panel} mt-5 p-4`}><p className="text-xs leading-6 text-white/60">Cancel this scheduled premiere for all attendees?</p><button disabled={busy} className={`${styles.button} ${styles.secondary} mt-3`} onClick={async () => {
          setBusy(true)
          try { await theaterRequest(`/api/theater/${id}`, { action: 'cancel' }); await refresh(); setConfirmCancel(false) }
          catch (error) { setError(error instanceof Error ? error.message : 'Could not cancel.') }
          finally { setBusy(false) }
        }}>Confirm cancellation</button></div>}
        {error && <p role="alert" className="mt-5 text-sm text-rose-200">{error}</p>}
      </div>
    </div>
    {room?.ratingRequired && <TheaterRating id={id!} title={premiere.title} onRated={refresh} />}
  </div></div>

  return <div ref={roomElement} className={styles.room}>
    <TheaterScene capacity={premiere?.capacity ?? (roomNumber % 3 === 0 ? 96 : roomNumber % 2 === 0 ? 24 : 48)} participants={room?.participants} mySeat={room?.mySeat ?? (roomNumber % 2 === 0 ? 11 : 27)} ownerView={isOwner && ownerView} video={streamUrl ? videoElement : null} resetKey={resetKey} onUnavailable={() => setFlatView(true)} />
    {streamUrl && <video ref={attachVideo} src={streamUrl} crossOrigin="anonymous" playsInline preload="auto" className={flatView ? 'absolute inset-0 h-full w-full bg-black object-contain' : 'pointer-events-none absolute h-px w-px opacity-0'} aria-label="Premiere playback" onLoadedMetadata={() => syncVideo(true)} onPlaying={() => {
      setNeedsPlay(false)
      if (id) void theaterRequest(`/api/theater/${id}`, { action: 'heartbeat', playing: true }).then(() => refresh()).catch(() => {})
    }} onEnded={() => { void refresh().catch(() => {}) }} onError={() => setError('The video could not load. Reconnect to the stream, or try a different browser.')} />}
    <div className={styles.roomShade} />

    <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-8">
      <div className="pointer-events-auto flex min-w-0 items-center gap-3"><span className="hidden rounded-xl border border-[#ddbd86]/30 bg-black/30 p-3 text-[#ddbd86] sm:block"><ClapperboardIcon size={20} /></span><div className="min-w-0"><p className="text-[8px] uppercase tracking-[.24em] text-[#ddbd86]">NoSpoilers Theater {preview ? `· Room ${String(roomNumber).padStart(2, '0')}` : isOwner ? '· Creator booth' : '· You’re in the audience'}</p><h1 className="mt-2 max-w-[52vw] truncate text-sm font-medium sm:text-base">{preview ? 'Welcome to your front-row moment.' : premiere?.title}</h1></div></div>
      <button onClick={leave} disabled={busy || room?.ratingRequired} className={`${styles.glass} ${styles.control} pointer-events-auto shrink-0 gap-2 px-4 text-xs`}>← <span className="hidden sm:inline">Back to lobby</span><span className="sm:hidden">Lobby</span></button>
    </header>

    <div className="pointer-events-none absolute left-5 top-28 sm:left-8 sm:top-32"><div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[9px] uppercase tracking-[.16em] text-white/60"><span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-[#a4d5aa]' : 'bg-[#ddbd86]'}`} />{preview ? 'Explore the space' : status === 'upcoming' ? `Doors open · ${countdown(startsAt - now)}` : status === 'live' ? 'Live premiere' : status === 'cancelled' ? 'Premiere cancelled' : 'That’s a wrap'}</div></div>

    {preview && <div className="pointer-events-none absolute bottom-40 left-5 max-w-xs sm:left-8"><p className="text-[10px] uppercase tracking-[.25em] text-[#ddbd86]">Go on. Look around.</p><p className="mt-3 text-xs leading-6 text-white/55">At a premiere, the film plays on this screen and other viewers’ avatars fill the seats.</p></div>}

    {needsPlay && status === 'live' && <div className="absolute inset-x-5 top-[43%] flex justify-center"><button onClick={() => syncVideo(true)} className={`${styles.button} shadow-2xl`}>▶ Join playback with sound</button></div>}
    {status === 'upcoming' && <div className="pointer-events-none absolute inset-x-5 bottom-44 text-center"><p className="text-[9px] uppercase tracking-[.22em] text-[#ddbd86]">You’re early. The best seats are yours.</p><p className="mt-3 font-mono text-3xl tracking-[.12em] text-white/85">{countdown(startsAt - now)}</p><p className="mt-3 text-xs text-white/45">Until the first frame · {present.length} in the audience</p></div>}
    {status === 'ended' && !room?.ratingRequired && <div className="absolute inset-x-5 top-[38%] flex justify-center"><div className={`${styles.glass} max-w-md rounded-2xl p-7 text-center`}><p className={styles.eyebrow}>Until the next first frame</p><h2 className={`${styles.title} mt-4 text-3xl`}>{isOwner ? 'Your audience has spoken.' : 'Thanks for being here.'}</h2><p className="mt-4 text-sm text-white/60">{isOwner ? `${room?.ratingSummary?.count ?? 0} ratings${room?.ratingSummary?.average ? ` · ${room.ratingSummary.average.toFixed(1)} / 5 stars` : ' · Results appear as viewers finish'}` : room?.myRating ? `Your ${room.myRating}-star rating is with the filmmaker.` : 'This premiere has ended.'}</p><button onClick={leave} className={`${styles.button} mt-6`}>Back to the marquee</button></div></div>}
    {status === 'cancelled' && <div className="absolute inset-x-5 top-[40%] text-center"><div className={`${styles.glass} mx-auto max-w-sm rounded-xl p-6`}><p>The creator cancelled this premiere.</p><button onClick={() => router.push('/theater')} className={`${styles.button} mt-5`}>Back to Theater</button></div></div>}

    {showAudience && <aside aria-label="Theater audience" className={`${styles.glass} absolute bottom-36 right-5 top-28 w-[min(300px,calc(100vw-40px))] overflow-y-auto rounded-xl p-5 sm:right-8`}><div className="flex items-center justify-between"><h2 className="text-xs font-medium">In the room <span className="ml-1 text-[#ddbd86]">{present.length}</span></h2><button className={styles.control} onClick={() => setShowAudience(false)} aria-label="Close audience">×</button></div><p className="mb-4 text-[10px] leading-5 text-white/40">{preview ? 'This is an empty theater preview.' : 'Avatars appear as viewers enter. Seats stay reserved if someone steps away.'}</p>{present.length === 0 ? <p className="py-6 text-xs text-white/50">The audience is yet to arrive.</p> : <ul className="space-y-3">{present.map(person => <li key={person.userId} className="flex items-center gap-3 border-t border-white/5 pt-3"><span className="flex h-8 w-8 items-center justify-center rounded-full text-xs" style={{ color: person.avatar.accent, background: person.avatar.suit, border: `1px solid ${person.avatar.accent}55` }}>{person.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-xs text-white/70">{person.name}{person.userId === room?.viewerId ? ' (you)' : ''}</span><span className="font-mono text-[10px] text-[#ddbd86]">{seatLabel(person.seat)}</span></li>)}</ul>}</aside>}

    {error && <div role="alert" className={`${styles.glass} absolute inset-x-5 bottom-40 mx-auto flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-xl p-4 text-xs text-rose-100`}><span>{error}</span>{status === 'live' && <button className="underline" onClick={() => { setError(''); setStreamAttempt(value => value + 1) }}>Reconnect playback</button>}<button aria-label="Dismiss message" className="px-2 text-lg" onClick={() => setError('')}>×</button></div>}

    <footer className="absolute inset-x-4 bottom-5 flex flex-col items-center gap-4 sm:inset-x-8 sm:bottom-7">
      <p className="pointer-events-none text-center text-[10px] tracking-wide text-white/40">{flatView ? 'Screen view' : isOwner && ownerView ? 'Drag to orbit · Scroll to zoom · R to reset' : 'Drag to look around · Arrow keys to turn · R to face the screen'}</p>
      <div className={`${styles.glass} flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 sm:px-5`}>
        <div className="flex items-center gap-3 px-2"><span className="text-lg text-[#ddbd86]" aria-hidden="true">⌑</span><div><p className="text-[8px] uppercase tracking-[.16em] text-white/35">{isOwner ? 'Director’s view' : 'Your seat'}</p><p className="mt-1 text-xs">{isOwner ? ownerView ? 'The whole theater' : 'Audience perspective' : `${seatLabel(room?.mySeat ?? 27)} · ${preview ? 'Preview' : 'Audience'}`}</p></div></div>
        <div className="flex items-center gap-1">
          <button className={styles.control} onClick={() => setResetKey(v => v + 1)} aria-label="Face the screen" title="Recenter view"><span className="text-xl" aria-hidden="true">⌖</span></button>
          <button className={`${styles.control} gap-2 px-2`} aria-label="Show audience" aria-expanded={showAudience} onClick={() => setShowAudience(v => !v)}><FriendsIcon size={17} /><span className="text-[10px]">{present.length}</span></button>
          {isOwner && <button className={`${styles.control} px-3 text-[10px]`} aria-pressed={ownerView} onClick={() => setOwnerView(v => !v)}>{ownerView ? 'Try a seat' : '3D overview'}</button>}
          {streamUrl && <><button className={`${styles.control} text-[10px]`} onClick={() => setVolume(v => v > 0 ? 0 : 0.8)} aria-label={volume > 0 ? 'Mute audio' : 'Unmute audio'}>{volume > 0 ? '♪' : '♪̸'}</button><input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" className="hidden w-16 accent-[#ddbd86] sm:block" /><button className={`${styles.control} px-2 text-[10px]`} aria-pressed={flatView} onClick={() => setFlatView(v => !v)}>{flatView ? '3D view' : 'Screen view'}</button></>}
          <button className={styles.control} onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>
        </div>
      </div>
      <p className="text-[8px] uppercase tracking-[.25em] text-white/20">Small filmmakers. A big-screen moment.</p>
    </footer>
    {room?.ratingRequired && <TheaterRating id={id!} title={premiere!.title} onRated={async () => { await refresh(); setEntered(false) }} />}
  </div>
}
