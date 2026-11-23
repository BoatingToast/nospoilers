'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowRightIcon, CloseIcon } from '@/components/icons'
import type { TheaterPremiere } from '@/lib/theater'
import type { TheaterDoor, WalkControls, WalkDirection } from './TheaterMultiplexScene'
import { durationLabel, hudControl, hudSurface, LivePing, premiereDate, theaterRequest } from './TheaterShared'
import styles from './theater.module.css'

const TheaterMultiplexScene = dynamic(() => import('./TheaterMultiplexScene'), { ssr: false })
type Lobby = { premieres: TheaterPremiere[]; pendingRatingId: string | null }

const WALK_CONTROLS: Array<[WalkDirection, string, string, string]> = [
  ['forward', '-rotate-90', 'Move forward', 'col-start-2'],
  ['left', 'rotate-180', 'Move left', 'col-start-1 row-start-2'],
  ['backward', 'rotate-90', 'Move backward', 'col-start-2 row-start-2'],
  ['right', '', 'Move right', 'col-start-3 row-start-2'],
]

function ShowtimeRow({ premiere, index }: { premiere: TheaterPremiere; index: number }) {
  const live = premiere.status === 'live'
  const filled = premiere.capacity ? premiere.reservedSeats / premiere.capacity : 0

  return (
    <li className={styles.rowIn} style={{ '--i': Math.min(index, 7) } as CSSProperties}>
      <Link href={`/theater/${premiere.id}?enter=1`} className="block rounded-xl bg-ns-surface-2 p-4 transition-colors duration-150 hover:bg-ns-surface-3">
        <div className="flex items-center justify-between gap-3">
          <p className={`flex items-center gap-2 text-sm font-semibold ${live ? 'text-ns-secondary-readable' : 'text-ns-muted'}`}>
            {live && <LivePing />}
            {premiere.kind === 'film' ? 'Film' : 'Trailer'} · {live ? 'Now showing' : premiere.status === 'upcoming' ? 'Upcoming' : premiere.status}
          </p>
          <span className="flex-shrink-0 text-sm tabular-nums text-ns-muted">{premiere.reservedSeats}/{premiere.capacity} seats</span>
        </div>
        <h3 className="mt-2 break-words font-heading text-xl font-bold text-ns-text">{premiere.title}</h3>
        <p className="mt-1 text-sm text-ns-muted">{premiereDate(premiere.startsAt)} · {durationLabel(premiere.durationSeconds)}</p>
        <p className="mt-1 text-sm text-ns-muted">By {premiere.creatorName}{premiere.isOwner ? ' · Your premiere' : ''}</p>
        <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-ns-bg">
          <div className={`h-full rounded-full bg-ns-accent ${styles.meter} ${styles.barGrow}`} style={{ transform: `scaleX(${filled})` }} />
        </div>
      </Link>
    </li>
  )
}

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

  return (
    <div ref={lobbyRef} className="fixed inset-0 isolate z-[80] overflow-hidden bg-black text-white">
      <TheaterMultiplexScene doors={doors} paused={showtimes} onNearDoor={setNearDoor} onEnter={enterDoor} onControls={controlsReady} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        <Link href="/pro" className="pointer-events-auto min-w-0">
          <h1 className="font-display text-3xl text-white sm:text-4xl">Theater</h1>
        </Link>
        <div className="pointer-events-auto flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => { stopMoving(); setShowtimes(v => !v) }}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ${showtimes ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface text-ns-text hover:bg-ns-surface-2'}`}
            aria-expanded={showtimes}
            aria-controls="theater-showtimes"
          >
            Showtimes
          </button>
          <span className="hidden sm:inline-flex">
            <Button href="/theater/new">Host a premiere <ArrowRightIcon size={14} /></Button>
          </span>
          <Link href="/pro" aria-label="Exit Theater" className="inline-flex min-h-11 items-center rounded-full bg-ns-surface px-4 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2">Exit</Link>
        </div>
      </header>

      <div className="pointer-events-none absolute left-4 top-[6.5rem] sm:left-6 sm:top-28">
        <div className="inline-flex items-center gap-2 rounded-full bg-ns-surface px-3 py-2 text-sm text-ns-muted">
          <LivePing />
          Main lobby / 8 screening rooms
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />

      {help && !showtimes && !nearDoor && (
        <div className={`${hudSurface} absolute bottom-44 left-4 max-w-[min(22rem,calc(100vw-2rem))] p-6 sm:bottom-32 sm:left-6 ${styles.hudIn}`}>
          <button className={`${hudControl} absolute right-2 top-2 text-ns-muted`} aria-label="Dismiss walking instructions" onClick={() => setHelp(false)}>
            <CloseIcon size={16} />
          </button>
          <h2 className="pr-10 font-display text-2xl text-ns-text sm:text-3xl">Welcome to the movies.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ns-muted">Walk through the lobby. Pick a door. Find your first frame.</p>
          <p className="mt-3 text-sm text-ns-muted">
            <kbd className="rounded-md bg-ns-surface-2 px-2 py-1 text-xs font-semibold text-ns-text">Arrows</kbd> or <kbd className="rounded-md bg-ns-surface-2 px-2 py-1 text-xs font-semibold text-ns-text">WASD</kbd> to walk
          </p>
          <p className="mt-2 text-sm text-ns-muted">Drag to look · E to enter a nearby theater</p>
        </div>
      )}

      {nearDoor && !showtimes && (
        <div className="absolute inset-x-4 bottom-44 flex justify-center sm:bottom-32">
          <div key={nearDoor.number} className={`${hudSurface} w-full max-w-md p-6 text-center ${styles.hudIn}`}>
            <p className="text-sm font-semibold text-ns-secondary-readable">Theater {String(nearDoor.number).padStart(2, '0')}</p>
            <h2 className="mt-1 break-words font-display text-3xl text-ns-text">{nearDoor.title}</h2>
            <p className="mt-1 text-sm text-ns-muted">{nearDoor.subtitle}</p>
            {nearDoor.href
              ? <Button className="mt-5 w-full" onClick={() => enterDoor(nearDoor)}>Enter theater <kbd className="ml-1 hidden rounded border border-ns-secondary-foreground px-1.5 text-xs sm:inline">E</kbd></Button>
              : <p className="mt-4 text-sm text-ns-muted">This room is waiting for its next premiere.</p>}
          </div>
        </div>
      )}

      {showtimes && (
        <aside
          id="theater-showtimes"
          data-theater-menu
          aria-label="Theater showtimes"
          className={`${hudSurface} absolute bottom-4 right-4 top-[4.75rem] z-10 w-[min(28rem,calc(100vw-2rem))] overflow-y-auto p-5 sm:bottom-6 sm:right-6 sm:top-24 sm:p-7 ${styles.drawerIn}`}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-3xl text-ns-text">Choose your theater.</h2>
            <button className={`${hudControl} -mr-2 -mt-1 flex-shrink-0`} onClick={() => setShowtimes(false)} aria-label="Close showtimes">
              <CloseIcon size={18} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ns-muted">Walk to a door, or enter a room directly from here.</p>

          {data?.pendingRatingId && (
            <Link href={`/theater/${data.pendingRatingId}`} className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-ns-tile-rose p-4 text-sm font-semibold text-ns-secondary-readable">
              Finish your last premiere rating to join another screening
              <ArrowRightIcon size={15} className="flex-shrink-0" />
            </Link>
          )}

          <Link href="/theater/preview" className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-ns-surface-2 p-4 transition-colors duration-150 hover:bg-ns-surface-3">
            <span>
              <span className="block text-sm font-semibold text-ns-secondary-readable">Theater 01 · Explore the space</span>
              <span className="mt-1 block text-base text-ns-text">Step inside an empty theater.</span>
            </span>
            <ArrowRightIcon size={16} className="flex-shrink-0 text-ns-muted" />
          </Link>

          {promotion && (
            <Link href={`/theater/${promotion.id}`} className="mt-3 block rounded-xl bg-ns-tile-rose p-5">
              <span className="block text-sm font-semibold text-ns-secondary-readable">Creator promotion</span>
              <span className="mt-2 block break-words font-heading text-2xl font-bold text-ns-text">{promotion.adCopy}</span>
              <span className="mt-2 block text-sm text-ns-muted">{promotion.title}</span>
            </Link>
          )}

          <div className="my-5 flex gap-1 rounded-full bg-ns-surface-2 p-1">
            {(['all', 'mine'] as const).map(value => (
              <button
                key={value}
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={`min-h-10 flex-1 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${tab === value ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:text-ns-text'}`}
              >
                {value === 'all' ? 'Premieres' : 'My premieres'}
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-xl bg-ns-surface-2 p-5">
              <p role="alert" className="text-sm leading-relaxed text-ns-muted">{error}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/login?callbackUrl=/theater" size="sm">Sign in</Button>
                <Button href="/pro/access" variant="outline" size="sm">Get Pro</Button>
                <Button onClick={refresh} variant="ghost" size="sm">Retry</Button>
              </div>
            </div>
          ) : !data ? (
            <div role="status" aria-label="Loading the marquee" className="space-y-3">
              <Skeleton className="h-28 w-full rounded-xl bg-ns-surface-2" />
              <Skeleton className="h-28 w-full rounded-xl bg-ns-surface-2" />
            </div>
          ) : listed.length === 0 ? (
            <div className="rounded-xl bg-ns-surface-2 p-6 text-center">
              <p className="font-heading text-xl font-bold text-ns-text">A new story awaits.</p>
              <p className="mt-2 text-sm leading-relaxed text-ns-muted">No premieres here yet. Your film could be the first.</p>
            </div>
          ) : (
            <ul key={tab} className="space-y-3">
              {listed.map((premiere, index) => <ShowtimeRow key={premiere.id} premiere={premiere} index={index} />)}
            </ul>
          )}

          <div className="mt-5 sm:hidden">
            <Button href="/theater/new" className="w-full">Host a premiere <ArrowRightIcon size={14} /></Button>
          </div>
        </aside>
      )}

      <footer className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
        <div className={`${hudSurface} pointer-events-auto flex items-center gap-1 py-1.5 pl-4 pr-1.5`}>
          <div>
            <p className="text-xs text-ns-muted">You are here</p>
            <p className="text-sm font-semibold text-ns-text">Main lobby<span className="hidden text-ns-muted sm:inline"> · First person</span></p>
          </div>
          <button className={`${hudControl} text-ns-muted`} onClick={() => setHelp(v => !v)} aria-label="Walking controls help">?</button>
        </div>
        <div className="pointer-events-auto grid grid-cols-3 gap-1" aria-label="Walking controls">
          {WALK_CONTROLS.map(([direction, rotation, label, position]) => (
            <button
              key={direction}
              className={`${position} flex h-12 w-12 select-none items-center justify-center rounded-full bg-ns-surface text-ns-text shadow-2xl transition-colors duration-150 hover:bg-ns-surface-2 active:bg-ns-surface-3`}
              style={{ touchAction: 'none' }}
              aria-label={label}
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); movementRef.current?.(direction, true); setHelp(false) }}
              onPointerUp={() => movementRef.current?.(direction, false)}
              onPointerCancel={() => movementRef.current?.(direction, false)}
              onLostPointerCapture={() => movementRef.current?.(direction, false)}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); movementRef.current?.(direction, true) } }}
              onKeyUp={() => movementRef.current?.(direction, false)}
              onBlur={() => movementRef.current?.(direction, false)}
            >
              <ArrowRightIcon size={18} className={rotation} />
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
