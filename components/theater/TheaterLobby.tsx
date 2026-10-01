'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TheaterPremiere } from '@/lib/theater'
import type { TheaterDoor, WalkControls, WalkDirection } from './TheaterMultiplexScene'
import { durationLabel, premiereDate, theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

const TheaterMultiplexScene = dynamic(() => import('./TheaterMultiplexScene'), { ssr: false })
type Lobby = { premieres: TheaterPremiere[]; pendingRatingId: string | null }

export default function TheaterLobby() {
  const router = useRouter()
  const lobbyRef = useRef<HTMLDivElement>(null)
  const movementRef = useRef<WalkControls | null>(null)
  const [data, setData] = useState<Lobby | null>(null)
  const [error, setError] = useState('')
  const [nearDoor, setNearDoor] = useState<TheaterDoor | null>(null)
  const [showtimes, setShowtimes] = useState(false)
  const [help, setHelp] = useState(true)
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const refresh = useCallback(async () => {
    try { setData(await theaterRequest<Lobby>('/api/theater')); setError('') }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load premieres.') }
  }, [])
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 30_000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const siblings: Array<{ element: HTMLElement; inert: boolean }> = []
    let branch: HTMLElement | null = lobbyRef.current
    while (branch && branch !== document.body) {
      for (const element of Array.from(branch.parentElement?.children ?? [])) {
        if (element !== branch && element instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(element.tagName)) {
          siblings.push({ element, inert: element.inert }); element.inert = true
        }
      }
      branch = branch.parentElement
    }
    return () => { document.body.style.overflow = previous; siblings.forEach(({ element, inert }) => { element.inert = inert }) }
  }, [])

  const premieres = useMemo(() => (data?.premieres ?? []).filter(p => p.status === 'live' || p.status === 'upcoming'), [data])
  const doors = useMemo<TheaterDoor[]>(() => Array.from({ length: 8 }, (_, i) => {
    if (i === 0) return { number: 1, title: 'Step inside.', subtitle: 'Explore an empty theater', badge: 'Open for a look around', href: '/theater/preview' }
    const p = premieres[i - 1]
    return p ? {
      number: i + 1, title: p.title, subtitle: premiereDate(p.startsAt), badge: p.status === 'live' ? 'Now showing' : `${p.kind} premiere`, href: `/theater/${p.id}?enter=1`,
    } : { number: i + 1, title: 'A new story awaits.', subtitle: 'Explore this empty screening room.', badge: 'No screening scheduled', href: `/theater/preview?room=${i + 1}` }
  }), [premieres])
  const enterDoor = useCallback((door: TheaterDoor) => { if (door.href) router.push(door.href) }, [router])
  const controlsReady = useCallback((controls: WalkControls | null) => { movementRef.current = controls }, [])
  const listed = tab === 'mine' ? data?.premieres.filter(p => p.isOwner) ?? [] : premieres
  const stopMoving = () => { for (const key of ['forward', 'backward', 'left', 'right'] as const) movementRef.current?.(key, false) }
  const promotion = premieres.find(p => p.promoted)

  return <div ref={lobbyRef} className={styles.room}>
    <TheaterMultiplexScene doors={doors} paused={showtimes} onNearDoor={setNearDoor} onEnter={enterDoor} onControls={controlsReady} />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#0b0811b3,transparent_22%,transparent_67%,#0b0811e6)]" />

    <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-8">
      <Link href="/pro" className="pointer-events-auto block"><h1 className="font-display text-4xl leading-none tracking-wide sm:text-5xl">Theater</h1><p className="mt-1 text-xs text-[#ddbd86]">NoSpoilers Pro</p></Link>
      <div className="pointer-events-auto flex gap-2"><button onClick={() => { stopMoving(); setShowtimes(v => !v) }} className={`${styles.glass} ${styles.control} gap-2 px-4 text-xs`} aria-expanded={showtimes} aria-controls="theater-showtimes">Showtimes <span className="text-[#ddbd86]" aria-hidden="true">☷</span></button><Link href="/theater/new" className={`${styles.button} hidden sm:inline-flex`}>Host a premiere</Link><Link href="/pro" aria-label="Exit Theater" className={`${styles.glass} ${styles.control} px-3 text-xs`}>Exit</Link></div>
    </header>

    <div className="pointer-events-none absolute left-5 top-28 sm:left-8"><p className="text-xs text-white/70">Main lobby · 8 screening rooms</p></div>
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />

    {help && !showtimes && !nearDoor && <div className={`${styles.glass} absolute bottom-44 left-5 max-w-[min(330px,calc(100vw-40px))] rounded p-5 sm:bottom-36 sm:left-8`}><button className={`${styles.control} absolute right-1 top-1 text-lg`} aria-label="Dismiss walking instructions" onClick={() => setHelp(false)}>×</button><h2 className="pr-10 font-display text-3xl leading-none tracking-wide">Welcome to the movies.</h2><p className="mt-3 text-xs leading-6 text-white/60">Walk through the lobby. Pick a door. Find your first frame.</p><div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/60"><span className="font-mono text-[#ddbd86]">↑ ← ↓ →</span><span>or WASD to walk</span></div><p className="mt-2 text-[11px] text-white/40">Drag to look · E to enter a nearby theater</p></div>}

    {nearDoor && !showtimes && <div className="absolute inset-x-5 bottom-40 flex justify-center sm:bottom-36"><div className={`${styles.glass} w-full max-w-md rounded p-5`}><h2 className="font-display text-3xl leading-none tracking-wide">{nearDoor.title}</h2><p className="mt-2 text-xs text-white/60">Theater {String(nearDoor.number).padStart(2, '0')} · {nearDoor.subtitle}</p>{nearDoor.href ? <button className={`${styles.button} mt-5 w-full`} onClick={() => enterDoor(nearDoor)}>Enter theater <kbd className="ml-2 hidden rounded border border-black/25 px-1.5 text-[11px] sm:inline">E</kbd></button> : <p className="mt-4 text-[11px] text-[#ddbd86]">This room is waiting for its next premiere.</p>}</div></div>}

    {showtimes && <aside id="theater-showtimes" data-theater-menu className={`${styles.glass} absolute bottom-5 right-5 top-24 z-10 w-[min(440px,calc(100vw-40px))] overflow-y-auto rounded p-5 sm:right-8 sm:top-28 sm:p-6`} aria-label="Theater showtimes">
      <div className="flex items-start justify-between gap-3 border-t-2 border-white/80 pt-3"><h2 className="font-display text-3xl leading-none tracking-wide">Choose your theater.</h2><button className={styles.control} onClick={() => setShowtimes(false)} aria-label="Close showtimes">×</button></div>
      <p className="mt-2 text-sm leading-6 text-white/60">Walk to a door, or enter a room directly from here.</p>
      {data?.pendingRatingId && <Link href={`/theater/${data.pendingRatingId}`} className="mt-4 block border-t border-white/15 py-3 text-sm leading-6 text-[#ddbd86] underline underline-offset-4">Finish your last premiere rating to join another screening →</Link>}
      <Link href="/theater/preview" className="mt-4 block border-t border-white/15 py-3 hover:bg-white/5"><p className="text-xs text-[#ddbd86]">Theater 01 · Explore the space</p><p className="mt-1 text-sm">Step inside an empty theater.</p></Link>
      {promotion && <Link href={`/theater/${promotion.id}`} className="block border-t border-white/15 py-3 hover:bg-white/5"><p className="text-xs text-[#ddbd86]">Creator promotion</p><p className="mt-1 break-words font-display text-2xl leading-none tracking-wide">{promotion.adCopy}</p><p className="mt-2 text-xs text-white/60">{promotion.title} ↗</p></Link>}
      <div className="flex gap-5 border-t border-white/15 pt-2">{(['all', 'mine'] as const).map(value => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`min-h-10 text-sm underline-offset-4 ${tab === value ? 'text-white underline' : 'text-white/60 hover:text-white'}`}>{value === 'all' ? 'Premieres' : 'My premieres'}</button>)}</div>
      {error ? <div className="border-t border-white/15 pt-3"><p className="text-sm leading-6 text-white/60">{error}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/login?callbackUrl=/theater" className={styles.button}>Sign in</Link><Link href="/pro/access" className={`${styles.button} ${styles.secondary}`}>Get Pro</Link><button onClick={refresh} className="min-h-10 px-2 text-sm text-white/60 underline underline-offset-4">Retry</button></div></div> : !data ? <p role="status" className="py-8 text-xs text-white/50">Loading the marquee…</p> : listed.length === 0 ? <div className="border-t border-white/15 py-4"><p className="font-display text-2xl leading-none tracking-wide">A new story awaits.</p><p className="mt-2 text-sm leading-6 text-white/60">No premieres here yet. Your film could be the first.</p></div> : <div>{listed.map(p => <Link href={`/theater/${p.id}?enter=1`} key={p.id} className="block border-t border-white/15 py-3 hover:bg-white/5"><h3 className="break-words font-display text-2xl leading-none tracking-wide">{p.title}</h3><p className="mt-2 text-xs text-[#ddbd86]">{p.kind} · {p.status === 'live' ? 'Now showing' : p.status} · {p.reservedSeats}/{p.capacity} seats</p><p className="mt-1 text-xs text-white/60">{premiereDate(p.startsAt)} · {durationLabel(p.durationSeconds)} · By {p.creatorName}{p.isOwner ? ' · Your premiere' : ''}</p></Link>)}</div>}
      <Link href="/theater/new" className={`${styles.button} mt-5 w-full`}>Host a premiere</Link>
    </aside>}

    <footer className="pointer-events-none absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 sm:inset-x-8 sm:bottom-7">
      <div className={`${styles.glass} pointer-events-auto flex items-center gap-2 rounded px-3 py-1 sm:px-4`}><p className="text-xs">You are here: Main lobby <span className="hidden text-[#ddbd86] sm:inline">· First person</span></p><button className={styles.control} onClick={() => setHelp(v => !v)} aria-label="Walking controls help">?</button></div>
      <div className="pointer-events-auto grid grid-cols-3 gap-1" aria-label="Walking controls">{([
        ['forward', '↑', 'Move forward', 'col-start-2'],
        ['left', '←', 'Move left', 'col-start-1 row-start-2'],
        ['backward', '↓', 'Move backward', 'col-start-2 row-start-2'],
        ['right', '→', 'Move right', 'col-start-3 row-start-2'],
      ] as Array<[WalkDirection, string, string, string]>).map(([direction, icon, label, position]) => <button key={direction} className={`${styles.glass} ${styles.control} ${position} select-none text-lg active:bg-[#ddbd86]/25`} style={{ touchAction: 'none' }} aria-label={label} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); movementRef.current?.(direction, true); setHelp(false) }} onPointerUp={() => movementRef.current?.(direction, false)} onPointerCancel={() => movementRef.current?.(direction, false)} onLostPointerCapture={() => movementRef.current?.(direction, false)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); movementRef.current?.(direction, true) } }} onKeyUp={() => movementRef.current?.(direction, false)} onBlur={() => movementRef.current?.(direction, false)}>{icon}</button>)}</div>
    </footer>
  </div>
}
